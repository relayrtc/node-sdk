# RelayRTC Node.js SDK

Typed server SDK for the RelayRTC public REST API. Manage rooms, issue participant tokens, remove participants, obtain TURN credentials, query usage and manage signed webhooks.

This package uses native Node.js fetch and crypto. It has no runtime package dependencies and does not import RelayRTC databases or internal service APIs. Node.js 22 or newer is required. The package provides ES modules and TypeScript declarations.

The implementation is not yet published or verified by build, type or runtime checks. The examples below use its implemented exports.

## Installation

After the package is published, use one package manager:

```sh
npm install @relayrtc/node
```

```sh
pnpm add @relayrtc/node
```

```sh
yarn add @relayrtc/node
```

## Configure the server client

```ts
import { RelayServer } from '@relayrtc/node'

const apiUrl = process.env.RELAYRTC_API_URL
const apiKey = process.env.RELAYRTC_SECRET_KEY

if (!apiUrl || !apiKey) throw new Error('Configure the RelayRTC API URL and secret key')

export const relay = new RelayServer({
  apiUrl,
  apiKey,
  timeoutMs: 10_000,
  retry: { maxAttempts: 3, initialDelayMs: 250, maxDelayMs: 2000 },
})
```

`apiUrl` is the API deployment URL, such as `https://api.example.com`. An existing `/v1` suffix is accepted; the SDK adds it otherwise. Reverse-proxy path prefixes are preserved. Secret keys use `rk_sk_...`; publishable keys are rejected by the server client. Scope comes from the key's project, environment and permissions.

Keep the client and key on your server. Authorize application users before creating tokens, returning TURN credentials or performing administrative operations. Send participant tokens to the browser, never the secret API key.

The following snippets reuse `relay` from the setup above. Each snippet is independent.

## Server quickstart

After installation, save this as `quickstart.mjs` in your server application and run `node quickstart.mjs` with the two environment variables configured. It creates a room and an initial participant token using the public API.

```js
import { RelayServer } from '@relayrtc/node'

const apiUrl = process.env.RELAYRTC_API_URL
const apiKey = process.env.RELAYRTC_SECRET_KEY
if (!apiUrl || !apiKey) throw new Error('Configure the RelayRTC API URL and secret key')

const relay = new RelayServer({ apiUrl, apiKey })
const room = await relay.rooms.create({ name: 'First call', maxParticipants: 4 })
const issued = await relay.tokens.create(room.id, {
  participantName: 'Alice',
  permissions: ['room:join', 'audio:publish', 'video:publish', 'messages:send'],
})

console.log(JSON.stringify({ roomId: room.id, token: issued.token, expiresAt: issued.expiresAt }))
```

The output contains a short-lived participant credential. Use it with the React/browser SDK during local development. In your application, deliver it through an authorized server endpoint instead of logging it. Room creation and token issuance are separate mutations; if token issuance fails, inspect or clean up the created room before repeating the quickstart.

## Inspect API-key context

```ts
const context = await relay.context()
console.log(context.projectId, context.environmentId, context.scopes)
```

## Create a room

```ts
const room = await relay.rooms.create({
  name: 'Team meeting',
  maxParticipants: 10,
  metadata: { meetingId: 'meeting_123' },
})

console.log(room.id, room.status)
```

Defaults are supplied by the API: metadata `{}` and capacity 100. Room creation returns the room, not a participant token.

## List and inspect rooms

```ts
const page = await relay.rooms.list({ limit: 20, status: 'active' })
const room = await relay.rooms.get('room_123')

console.log(page.nodes, room)

if (page.pageInfo.hasNextPage && page.pageInfo.endCursor) {
  const nextPage = await relay.rooms.list({
    limit: 20,
    status: 'active',
    cursor: page.pageInfo.endCursor,
  })
  console.log(nextPage.nodes)
}
```

Room statuses are `created`, `active`, `ending`, `ended`, and `failed`. Preserve the same filters while following a cursor. Pagination is explicit; methods do not fetch every page automatically.

## Issue a participant token

```ts
const issued = await relay.tokens.create('room_123', {
  participantName: 'Alice',
  permissions: ['room:join', 'audio:publish', 'video:publish', 'screen:publish', 'messages:send', 'metadata:update'],
  ttlSeconds: 600,
  metadata: { userId: 'user_123' },
})

const browserCredentials = {
  token: issued.token,
  participantId: issued.participantId,
  expiresAt: issued.expiresAt,
}
```

Return `browserCredentials` only to the authorized user who owns that participant. `room:join` is mandatory. Permissions must be unique. Token lifetime is 60–3600 seconds; the default is 600 seconds with only `room:join`.

Every token-create call creates a new participant ID. It cannot renew an existing participant for a long call. A public identity-preserving renewal endpoint is still needed; the SDK does not expose a fabricated renewal method or sign tokens with internal keys.

## List and inspect participants

```ts
const page = await relay.participants.list('room_123', { limit: 20, status: 'active' })
const participant = await relay.participants.get('room_123', 'participant_123')

console.log(page.nodes, participant.name, participant.metadata)
```

Participant lists use the same `nodes` and `pageInfo` cursor format as rooms. Filter status with `active` or `left`.

## Remove a participant

```ts
const result = await relay.participants.remove('room_123', 'participant_123')

if (result.status === 'pending') {
  console.log(result.operation.id, result.operation.status)
  const current = await relay.participants.getRuntimeOperation('room_123', 'participant_123')
  console.log(current.status, current.lastError)
}
```

## End a room

```ts
const result = await relay.rooms.end('room_123')

if (result.status === 'pending') {
  const current = await relay.rooms.getRuntimeOperation('room_123')
  console.log(current.status, current.attempts, current.lastError)
}
```

Cleanup methods return a discriminated result:

- `{ status: 'completed', httpStatus: 204 }` means the API completed cleanup.
- `{ status: 'pending', httpStatus: 202, operation }` means cleanup was accepted; inspect the operation until it completes.

Runtime operation statuses are `pending`, `running`, `failed`, and `completed`. A `202` is not proof that all runtime resources were removed. Status reads are separate requests; the SDK does not poll automatically.

## Obtain TURN credentials

```ts
const initialCredentials = await relay.turn.createCredentials()

const sessionCredentials = await relay.turn.createCredentials({
  roomId: 'room_123',
  sessionId: 'session_123',
})

console.log(initialCredentials.expiresAt, sessionCredentials.iceServers)
```

Provide an empty input or both `roomId` and `sessionId`. The API validates that the session belongs to the key's project/environment. Credentials are short lived and include `username`, `ttlSeconds`, `expiresAt`, and ICE servers. Return them only to the authorized caller.

## Query usage

```ts
const report = await relay.usage.get({ range: '7d', granularity: 'day' })
const turn = await relay.usage.get({ category: 'turn', range: '24h', granularity: 'hour' })
const custom = await relay.usage.get({
  category: 'participants',
  startedAt: '2026-10-01T00:00:00.000Z',
  endedAt: '2026-10-02T00:00:00.000Z',
  granularity: 'hour',
})

console.log(report.summary, turn.dataQuality, custom.buckets)
```

Categories are `all`, `rooms`, `participants`, `sfu`, `turn`, `signaling`, and `screen-share`. Ranges are `24h`, `7d`, `14d`, and `30d`; the default is `7d`. Supply a range or both explicit boundaries, never both. Custom windows must be positive, at most 30 days, within retained history, and end no later than the current time. Adjust sample dates to your available data.

Reports include scope, UTC window, bucket semantics, metric definitions, summary, buckets and data quality. Only the metrics applicable to the category are present. Inspect `dataQuality.turnTraffic` before treating TURN data as authoritative; unavailable metrics are not necessarily zero.

## Create and configure webhooks

```ts
const created = await relay.webhooks.create({
  url: 'https://your-app.example.com/webhooks/relayrtc',
  eventTypes: ['room.ended', 'participant.left', 'connection.degraded'],
})

const endpoint = await relay.webhooks.get(created.id)
const page = await relay.webhooks.list({ limit: 20, offset: 0 })

await relay.webhooks.update(created.id, {
  eventTypes: ['room.ended', 'participant.left'],
  status: 'enabled',
})

console.log(endpoint.status, page.pagination)
```

Securely save `created.signingSecret` on your application server. The secret is revealed only when creating an endpoint or rotating its key. Ordinary get/list/update calls return configuration without the secret. URLs must resolve to public HTTP/HTTPS destinations allowed by the API.

Supported event types:

- `room.created`, `room.started`, `room.ended`
- `participant.joined`, `participant.left`, `participant.reconnected`
- `track.published`, `track.unpublished`
- `connection.degraded`, `connection.recovered`

## Disable, rotate or remove a webhook

```ts
await relay.webhooks.update('webhook_123', { status: 'disabled' })
await relay.webhooks.update('webhook_123', { status: 'enabled' })

const rotated = await relay.webhooks.rotateSecret('webhook_123')
await saveSigningSecret(rotated.id, rotated.signingSecret)

await relay.webhooks.remove('webhook_123')
```

`saveSigningSecret` represents your application's secure secret storage. Rotation replaces the signing secret immediately. Coordinate your receiver's configuration update with the rotation. Successful removal returns `undefined` after HTTP `204`.

## Inspect delivery logs and replay

```ts
const page = await relay.webhooks.deliveries.list('webhook_123', {
  status: 'failed',
  limit: 20,
  offset: 0,
})

const first = page.deliveries[0]
if (first) {
  const detail = await relay.webhooks.deliveries.get('webhook_123', first.id)
  console.log(detail.event, detail.attempts, detail.lastError)

  const replayed = await relay.webhooks.deliveries.replay('webhook_123', first.id, {
    expectedReplayCount: detail.replayCount,
  })
  console.log(replayed.status, replayed.replayCount)
}
```

Replay requires an enabled endpoint, a terminal delivery and its current replay count. `expectedReplayCount` is 0–99; the API allows up to 100 explicit replays. A conflict requires reading the current record and deciding what to do. The SDK never blindly retries replay requests. Accepted replay returns a pending delivery, retaining its event and delivery IDs.

## Verify webhook requests

```ts
import { verifyWebhookRequest } from '@relayrtc/node'

const valid = verifyWebhookRequest(signingSecret, rawRequestBody, request.headers)

if (!valid) throw new Error('Invalid webhook signature')
```

Pass your saved complete `whsec_...` secret, the exact raw body as a string or `Uint8Array`/Buffer, and either a `Headers` object or Node request headers. Header names are case insensitive; ambiguous duplicate header values are rejected. Verification uses HMAC-SHA256 and constant-time comparison, validates delivery ID and replay count, and rejects timestamps more than five minutes away from the current time. The key-version header is not part of the HMAC input; do not treat it as an independently authenticated claim.

The verifier does not consume the body or parse JSON. Verify before parsing, then validate the event and atomically persist its event ID with your business processing to prevent duplicate effects. Retries and replays intentionally retain event IDs. Apply a request body limit in your HTTP server.

You can reduce the time tolerance or supply a clock:

```ts
const valid = verifyWebhookRequest(signingSecret, rawRequestBody, request.headers, {
  toleranceSeconds: 120,
  now: new Date(),
})
```

Fetch the authoritative delivery/signature policy from your API deployment:

```ts
const contract = await relay.webhooks.signatureContract()
console.log(contract.algorithm, contract.attemptsPerRun, contract.backoffSeconds)
```

## Scope and cancellation for webhook methods

Webhook scope defaults to the API key's project and environment. Optional scope query fields must still match the key's authorization; they do not grant cross-project access.

```ts
const controller = new AbortController()

const endpoint = await relay.webhooks.get(
  'webhook_123',
  { projectId: 'project_123', environmentId: 'env_123' },
  { signal: controller.signal, timeoutMs: 5000 },
)
```

List methods combine scope with pagination/filter fields in the same query object. Other webhook methods accept scope before request options; pass `{}` to use the key's defaults. For example, `rotateSecret(id, {}, { signal })`.

## Typed errors, timeouts and retries

```ts
import { RelayApiError } from '@relayrtc/node'

try {
  const room = await relay.rooms.get('room_123', { timeoutMs: 5000, retry: false })
  console.log(room.name)
} catch (error) {
  if (!(error instanceof RelayApiError)) throw error
  console.error(error.code, error.status, error.requestId)
}
```

API errors preserve `code`, description as `message`, HTTP `status`, `requestId`, and `retryable`. Local errors use codes `INVALID_CONFIGURATION`, `INVALID_REQUEST`, `INVALID_RESPONSE`, `NETWORK_ERROR`, `REQUEST_TIMEOUT`, or `REQUEST_CANCELLED`. Errors without an HTTP response have a null status and request ID.

The default timeout is 10 seconds for the entire operation, including retries, backoff and body reads. Configure 1–300000 milliseconds globally or per request. All methods accept an optional `signal`. A custom fetch implementation must honor that signal.

GET requests permit up to three total attempts by default, retrying network failures, HTTP `408`, `425`, `429`, and `5xx`. Delays are exponential and bounded by `maxDelayMs`; a valid `Retry-After` takes precedence within the overall timeout. Set global `retry: false` or request `retry: false` to disable retries. Configured attempts are limited to 1–5.

POST, PATCH and DELETE are attempted once, including room creation, token issuance, TURN issuance, secret rotation, removal and replay. A timeout or network error during a mutation can leave its server outcome uncertain. Read current state before deciding whether to repeat it. The SDK does not fabricate idempotency headers for endpoints that do not support them. `retryable` describes a transient failure; it is not permission to repeat a mutation.

Redirects are rejected to avoid forwarding credentials or mutation bodies to a different destination. Responses are limited to 8 MiB by default; configure `maxResponseBytes` from 1 KiB to 32 MiB. The SDK checks JSON syntax and response envelopes; operation-specific data contracts are enforced by the API and represented by the exported TypeScript types.

## Required scopes

| Operation | API-key scope |
| --- | --- |
| Create rooms | `rooms:create` |
| Read rooms and room cleanup operations | `rooms:read` |
| End rooms | `rooms:end` |
| Issue participant tokens or TURN credentials | `tokens:create` |
| Read participants and removal operations | `participants:read` |
| Remove participants | `participants:remove` |
| Read usage | `usage:read` |
| Read webhook configuration, logs or signature policy | `webhooks:read` |
| Create, update, rotate, delete or replay webhooks | `webhooks:write` |

For client media controls, chat, screen sharing and connection quality, use the [React SDK](https://github.com/relayrtc/react-sdk) or the browser client. This Node SDK manages the public server API; it does not join a media session.
