export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[]
export interface JsonObject { readonly [key: string]: JsonValue }

export interface RetryOptions {
  readonly maxAttempts?: number
  readonly initialDelayMs?: number
  readonly maxDelayMs?: number
}

export interface RelayServerOptions {
  readonly apiUrl: string
  readonly apiKey: string
  readonly timeoutMs?: number
  readonly retry?: false | RetryOptions
  readonly maxResponseBytes?: number
  readonly fetch?: typeof globalThis.fetch
}

export interface RequestOptions {
  readonly idempotencyKey?: string
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly retry?: false
}

export interface ApiContext {
  readonly apiVersion: string
  readonly projectId: string
  readonly environmentId: string
  readonly keyId: string
  readonly keyType: 'publishable' | 'secret'
  readonly scopes: readonly string[]
}

export type RoomStatus = 'created' | 'active' | 'ending' | 'ended' | 'failed'
export interface Room {
  readonly id: string
  readonly projectId: string
  readonly environmentId: string
  readonly name: string
  readonly metadata: JsonObject
  readonly status: RoomStatus
  readonly maxParticipants: number
  readonly createdAt: string
  readonly startedAt: string | null
  readonly endedAt: string | null
}

export interface CursorPage<T> {
  readonly nodes: readonly T[]
  readonly pageInfo: { readonly endCursor: string | null; readonly hasNextPage: boolean }
}

export interface CreateRoomInput {
  readonly name: string
  readonly metadata?: JsonObject
  readonly maxParticipants?: number
}

export interface ListRoomsQuery {
  readonly cursor?: string
  readonly limit?: number
  readonly status?: RoomStatus
}

export interface RuntimeOperation {
  readonly id: string
  readonly kind: string
  readonly status: 'pending' | 'running' | 'failed' | 'completed'
  readonly attempts: number
  readonly lastError: string | null
  readonly completedAt: string | null
  readonly [key: string]: unknown
}

export type CleanupResult =
  | { readonly status: 'completed'; readonly httpStatus: 204 }
  | { readonly status: 'pending'; readonly httpStatus: 202; readonly operation: RuntimeOperation }

export const participantPermissions = [
  'room:join', 'audio:publish', 'video:publish', 'screen:publish', 'messages:send', 'metadata:update',
] as const
export type ParticipantPermission = typeof participantPermissions[number]

export interface CreateParticipantTokenInput {
  readonly participantName: string
  readonly permissions?: readonly ParticipantPermission[]
  readonly metadata?: JsonObject
  readonly ttlSeconds?: number
}

export interface ParticipantToken {
  readonly token: string
  readonly participantId: string
  readonly tokenId: string
  readonly expiresAt: string
}

export interface Participant {
  readonly id: string
  readonly roomId: string
  readonly externalId: string | null
  readonly name: string
  readonly metadata: JsonObject
  readonly role: string
  readonly joinedAt: string
  readonly leftAt: string | null
}

export interface ListParticipantsQuery {
  readonly cursor?: string
  readonly limit?: number
  readonly status?: 'active' | 'left'
}

export type CreateTurnCredentialsInput =
  | { readonly roomId: string; readonly sessionId: string; readonly participantId?: string }
  | { readonly roomId?: never; readonly sessionId?: never; readonly participantId?: never }

export interface TurnCredentials {
  readonly expiresAt: string
  readonly username: string
  readonly ttlSeconds: number
  readonly iceServers: readonly {
    readonly urls: readonly string[]
    readonly username?: string
    readonly credential?: string
    readonly credentialType?: 'password'
  }[]
}

export const webhookEventTypes = [
"stream.guest.invited","stream.guest.invite_accepted","stream.guest.invite_declined","stream.guest.requested","stream.guest.request_approved","stream.guest.request_rejected","stream.guest.joined","stream.guest.left","stream.guest.removed","stream.guest.muted","stream.guest.invite_expired","stream.guest.invite_cancelled","stream.guest.grant_revoked",
  "dvr.enabled", "dvr.window_changed", "dvr.segment_evicted", "dvr.disabled",
 "mixer.started", "mixer.scene_activated", "mixer.source_lost", "mixer.overloaded", "mixer.stopped", "mixer.failed",
  "clip.requested", "clip.rendering", "clip.ready", "clip.failed", "clip.deleted",
  "restream.probing",
  "restream.source_connected",
  "restream.source_lost",
  "restream.recovering",
  "restream.stopped",
  "restream.failed",
  "schedule.created",
  "schedule.updated",
  "schedule.starting",
  "schedule.started",
  "schedule.missed",
  "schedule.cancelled",
  "schedule.failed",
  "schedule.completed",
  "schedule.reminder",

  "recording.started",
  "recording.segment_committed",
  "recording.finalizing",
  "recording.ready",
  "recording.failed",
  "recording.deleted",

  "destination.created",
  "destination.connected",
  "destination.disconnected",
  "destination.retrying",
  "destination.failed",
  "broadcast.created",
  "broadcast.starting",
  "broadcast.live",
  "broadcast.reconnecting",
  "broadcast.output_degraded",
  "broadcast.stopped",
  "broadcast.failed",
  "stream.created",
  "stream.starting",
  "stream.live",
  "stream.reconnecting",
  "stream.ended",
  "stream.failed",
  "room.created",
  "room.started",
  "room.ended",
  "participant.joined",
  "participant.left",
  "participant.reconnected",
  "track.published",
  "track.unpublished",
  "connection.degraded",
  "connection.recovered",
] as const
export type WebhookEventType = typeof webhookEventTypes[number]
export type WebhookEndpointStatus = 'enabled' | 'disabled'
export type WebhookDeliveryStatus = 'pending' | 'delivering' | 'succeeded' | 'failed' | 'cancelled'

export interface WebhookScopeQuery {
  readonly projectId?: string
  readonly environmentId?: string
}

export interface OffsetQuery extends WebhookScopeQuery {
  readonly limit?: number
  readonly offset?: number
}

export interface OffsetPagination {
  readonly limit: number
  readonly offset: number
  readonly total: number
}

export interface CreateWebhookInput {
  readonly url: string
  readonly eventTypes: readonly WebhookEventType[]
  readonly status?: WebhookEndpointStatus
}

export interface UpdateWebhookInput {
  readonly url?: string
  readonly eventTypes?: readonly WebhookEventType[]
  readonly status?: WebhookEndpointStatus
}

export interface WebhookEndpoint {
  readonly id: string
  readonly projectId: string
  readonly environmentId: string
  readonly url: string
  readonly eventTypes: readonly WebhookEventType[]
  readonly status: WebhookEndpointStatus
  readonly signingSecretVersion: number
  readonly signingSecretRotatedAt: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface RevealedWebhookEndpoint extends WebhookEndpoint {
  readonly signingSecret: string
  readonly rotationPolicy: 'immediate replacement'
}

export interface WebhookEndpointList {
  readonly endpoints: readonly WebhookEndpoint[]
  readonly pagination: OffsetPagination
}

export interface WebhookEvent {
  readonly id: string
  readonly type: WebhookEventType
  readonly projectId: string
  readonly environmentId: string
  readonly occurredAt: string
  readonly data: JsonObject
}

export interface WebhookDelivery {
  readonly id: string
  readonly endpointId: string
  readonly eventId: string
  readonly projectId: string
  readonly environmentId: string
  readonly url: string
  readonly status: WebhookDeliveryStatus
  readonly attemptCount: number
  readonly runAttemptCount: number
  readonly replayCount: number
  readonly lastError: string | null
  readonly nextAttemptAt: string | null
  readonly deliveredAt: string | null
  readonly runStartedAt: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WebhookDeliveryAttempt {
  readonly id: string
  readonly attemptNumber: number
  readonly replayCount: number
  readonly status: 'started' | 'succeeded' | 'failed' | 'abandoned'
  readonly signingSecretVersion: number
  readonly signatureTimestamp: number
  readonly httpStatus: number | null
  readonly errorCode: string | null
  readonly startedAt: string
  readonly finishedAt: string | null
}

export interface WebhookDeliveryDetail extends WebhookDelivery {
  readonly event: WebhookEvent
  readonly rawBody: string
  readonly attempts: readonly WebhookDeliveryAttempt[]
}

export interface WebhookDeliveryList {
  readonly deliveries: readonly WebhookDelivery[]
  readonly pagination: OffsetPagination
}

export interface ListWebhookDeliveriesQuery extends OffsetQuery {
  readonly status?: WebhookDeliveryStatus
}

export interface ReplayWebhookDeliveryInput { readonly expectedReplayCount: number }

export interface WebhookSignatureContract {
  readonly version: 'v1'
  readonly algorithm: 'HMAC-SHA256'
  readonly signatureHeader: string
  readonly deliveryIdHeader: string
  readonly replayCountHeader: string
  readonly secretVersionHeader: string
  readonly signedContent: string
  readonly signatureFormat: string
  readonly secretEncoding: string
  readonly toleranceSeconds: number
  readonly attemptsPerRun: number
  readonly maximumExplicitReplays: number
  readonly backoffSeconds: readonly number[]
  readonly maximumRunAgeDays: number
  readonly terminalRetentionDays: number
  readonly [key: string]: string | number | readonly number[]
}

export type UsageCategory = 'all' | 'rooms' | 'participants' | 'sfu' | 'turn' | 'signaling' | 'screen-share'
export type UsageRange = '24h' | '7d' | '14d' | '30d'

type UsageWindowQuery =
  | { readonly range?: UsageRange; readonly startedAt?: never; readonly endedAt?: never }
  | { readonly range?: never; readonly startedAt: string; readonly endedAt: string }

export type UsageQuery = UsageWindowQuery & {
  readonly projectId?: string
  readonly environmentId?: string
  readonly granularity?: 'hour' | 'day'
  readonly category?: UsageCategory
}

export type UsageMetric =
  | 'participantSeconds' | 'participantMinutesDerived' | 'audioParticipantSeconds'
  | 'videoParticipantSeconds' | 'screenShareSeconds' | 'screenShareIngressBytes'
  | 'screenShareEgressBytes' | 'sfuIngressBytes' | 'sfuEgressBytes' | 'turnIngressBytes'
  | 'turnEgressBytes' | 'turnRelaySeconds' | 'turnSessions' | 'roomsCreated' | 'roomsStarted'
  | 'roomSeconds' | 'averageConcurrentParticipants' | 'peakConcurrentParticipants'
  | 'peakConcurrentRooms' | 'signalingConnections' | 'signalingConnectionSeconds'
  | 'signalingMessagesIn' | 'signalingMessagesOut'

export type UsageMetrics = Readonly<Partial<Record<UsageMetric, number>>>

export interface UsageMetricDefinition {
  readonly unit: 'seconds' | 'minutes' | 'bytes' | 'count' | 'participants'
  readonly aggregation: 'sum' | 'union_seconds' | 'count' | 'peak' | 'time_weighted_average' | 'derived' | 'gauge'
  readonly integer: boolean
  readonly definition: string
  readonly source: string
}

export interface UsageResponse {
  readonly scope: { readonly organizationId: string; readonly projectId: string; readonly environmentId: string }
  readonly category: UsageCategory
  readonly window: {
    readonly range: UsageRange | 'custom'
    readonly startedAt: string
    readonly endedAt: string
    readonly timezone: 'UTC'
    readonly endExclusive: true
  }
  readonly bucketDefinition: {
    readonly granularity: 'hour' | 'day'
    readonly alignment: 'UTC calendar boundaries'
    readonly partialEdges: 'clipped to requested window'
    readonly durations: 'lifecycle intervals clipped to each bucket'
    readonly events: 'attributed to occurrence time'
  }
  readonly metricDefinitions: Readonly<Partial<Record<UsageMetric, UsageMetricDefinition>>>
  readonly summary: UsageMetrics
  readonly buckets: readonly { readonly startedAt: string; readonly endedAt: string; readonly metrics: UsageMetrics }[]
  readonly dataQuality: {
    readonly sessionHistory: 'complete' | 'partial'
    readonly messageHistory: 'complete' | 'partial'
    readonly turnTraffic: 'unavailable' | 'partial' | 'authoritative'
    readonly mediaDurations: 'observation_time'
  }
}
