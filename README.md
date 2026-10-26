# RelayRTC Node.js SDK

Typed server client for the RelayRTC management API. Create rooms, issue participant tokens, manage streaming resources, read usage and verify webhooks.

Requires **Node.js 22 or newer**. The package provides ES modules and TypeScript declarations and uses native Node.js fetch and crypto, with no runtime package dependencies.

## Install

```sh
npm install @relayrtc/node
```

Connect to an existing RelayRTC deployment. Installing the SDK does not start the API or media services. See [installation and compatibility](https://docs.relayrtc.com/installation) for supported package and server combinations.

## Create a call

Set `RELAYRTC_API_URL` to your deployment's API URL, such as `https://api.example.com/v1`, and `RELAYRTC_SECRET_KEY` to an environment-scoped secret key with `rooms:create` and `tokens:create`.

The following server module creates a new room and its first participant credential:

```ts
import { RelayServer } from '@relayrtc/node'

const apiUrl = process.env.RELAYRTC_API_URL
const apiKey = process.env.RELAYRTC_SECRET_KEY
if (!apiUrl || !apiKey) throw new Error('Configure the RelayRTC API URL and secret key')

const relay = new RelayServer({ apiUrl, apiKey })

export async function createCall(participantName: string) {
  const room = await relay.rooms.create({
    name: 'Team call',
    maxParticipants: 10,
  })
  const credential = await relay.tokens.create(room.id, {
    participantName,
    permissions: ['room:join', 'audio:publish', 'video:publish'],
    ttlSeconds: 600,
  })
  return { roomId: room.id, ...credential }
}
```

Call this helper from an authenticated backend action after checking the user's permission to create a call. Save the room ID in your application. For subsequent callers, authorize access to that saved room and issue each person a separate participant token. Creation and token issuance are separate writes: if token issuance fails, the room may already exist. Handle that outcome before retrying the helper.

Return participant credentials only to their authorized owner. Keep the secret API key on your backend and out of browser bundles and logs. Connect the returned participant token using the [React SDK](https://docs.relayrtc.com/reference/sdk/client/react/overview) or [browser SDK](https://docs.relayrtc.com/reference/sdk/client/javascript/overview).

## Requests and errors

Methods return promises and throw [`RelayApiError`](https://docs.relayrtc.com/reference/sdk/server/node/RelayApiError) on failure. GET requests use bounded retries; mutations are not retried automatically. Streaming commands support explicit idempotency keys. See [request options](https://docs.relayrtc.com/reference/sdk/server/node/request-options) for cancellation, timeouts, retry behavior and uncertain outcomes.

## Documentation

- [Build your first call](https://docs.relayrtc.com/quickstart)
- [Node SDK reference](https://docs.relayrtc.com/reference/sdk/server/node/overview)
- [Streaming](https://docs.relayrtc.com/guides/live-streaming)
- [Webhook verification](https://docs.relayrtc.com/reference/sdk/server/node/verifyWebhookRequest)
- [Usage and measurement rules](https://docs.relayrtc.com/guides/usage)

## Support and license

Report SDK bugs in [GitHub Issues](https://github.com/relayrtc/node-sdk/issues). Include package versions and a minimal reproduction; remove API keys, participant tokens and private media URLs.

Licensed under [Apache-2.0](LICENSE).
