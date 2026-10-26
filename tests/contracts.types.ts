import type {
  ClipListQuery, ClipPage,
  CreateIngestCredentialInput, CreatePlaybackGrantInput, IngestCredentialList,
  ListRoomsQuery, RelayServer, ServiceUsageCoverage, ServiceUsageReport,
  StreamPlayback, StreamPlaybackReadiness, StreamingOperation, UsageCategory,
} from '../src/index.js'

/** Compile-only checks; these requests are never executed. */
export async function checkRequestContracts(relay: RelayServer) {
  const input: CreateIngestCredentialInput = { ttlSeconds: 600 }
  await relay.streams.createIngestCredentials('stream_test', input)
  // @ts-expect-error DVR selection belongs to viewer grants, not encoder credentials.
  await relay.streams.createIngestCredentials('stream_test', { mode: 'dvr' })
  // @ts-expect-error A broadcast selection is not accepted by the ingest credential schema.
  await relay.streams.rotateIngestCredentials('stream_test', 'ingest_test', { broadcastId: 'run_test' })
  const viewerInput: CreatePlaybackGrantInput = { mode: 'dvr', broadcastId: 'run_test', ttlSeconds: 120 }
  await relay.streams.createPlaybackGrant('stream_test', viewerInput)
  const list: IngestCredentialList = await relay.streams.listIngestCredentials('stream_test')
  // @ts-expect-error Secret material is never returned by credential lists.
  list.data[0]?.secret
  const rotated = await relay.streams.rotateIngestCredentials('stream_test', 'ingest_test')
  const handoverStatus: 'ready' | 'pending' = rotated.handover.status
  const filters: ListRoomsQuery = { search: 'Planning', joinable: false }
  await relay.rooms.list(filters)
  // @ts-expect-error The SDK accepts a boolean, and serializes the API's string query.
  await relay.rooms.list({ joinable: 'true' })
  await relay.broadcasts.list({ order: 'newest', activeOnly: true })
  // @ts-expect-error API sort modes are limited to id/newest.
  await relay.broadcasts.list({ order: 'oldest' })
  // @ts-expect-error Boolean query filters are serialized by the SDK.
  await relay.broadcasts.list({ activeOnly: 'true' })
  const clipFilters: ClipListQuery = { cursor: 'clip_previous', limit: 20 }
  const clipPage: ClipPage = await relay.clips.list(clipFilters)
  const streamClipPage: ClipPage = await relay.streams.clips.list('stream_test', clipFilters)
  // @ts-expect-error The secret API key supplies the project and environment scope.
  await relay.clips.list({ projectId: 'project_test', environmentId: 'env_test' })
  const category: UsageCategory = 'streaming'
  const usage = await relay.usage.get({ category })
  const serviceUsage: ServiceUsageReport | undefined = usage.serviceUsage
  return { handoverStatus, serviceUsage, clipPage, streamClipPage }
}

export function checkResponseContracts(playback: StreamPlayback, serviceUsage: ServiceUsageReport) {
  const readiness: StreamPlaybackReadiness = playback.readiness
  const sourceState: StreamPlayback['sourceState'] = 'live'
  // @ts-expect-error Readiness is a viewer observation, with no 'live' status.
  const invalidReadiness: StreamPlaybackReadiness['status'] = 'live'
  const sourceCommand: StreamingOperation = {
    id: 'operation_test', streamId: 'stream_test', sessionId: null, kind: 'stop',
    status: 'pending', errorCode: null, createdAt: '2026-10-25T12:00:00Z', completedAt: null,
  }
  const operationRead: StreamingOperation = { ...sourceCommand, broadcastId: null, outputId: null }
  const { sessionId, ...withoutSession } = sourceCommand
  // @ts-expect-error API source operations include a nullable sessionId, rather than omitting it.
  const invalidOperation: StreamingOperation = withoutSession
  const frames: number = serviceUsage.summary.mixerFrames
  const coverage: ServiceUsageCoverage = serviceUsage.coverage.viewerSeconds
  // @ts-expect-error Unknown usage metrics must not silently typecheck.
  serviceUsage.summary.nonexistentMetric
  return { readiness, sourceState, invalidReadiness, operationRead, invalidOperation, sessionId, frames, coverage }
}
