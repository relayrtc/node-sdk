/** Streaming foundation contracts. Requires the unreleased Phase 0 API. */
export type StreamSource = { kind: 'room'; roomId: string; videoTrackIds?: string[]; audioTrackIds?: string[] } | { kind: 'whip' | 'rtmp' }
export interface StreamProfile {
  audioOnly: boolean; width: number; height: number; fps: number
  videoBitrate: number; audioBitrate: number; layout: 'single' | 'grid'
}
export interface CreateStreamInput {
  name: string; source: StreamSource; profile?: Partial<StreamProfile>
  maxDurationSeconds?: number; retentionSeconds?: number
}
export interface UpdateStreamInput extends Partial<CreateStreamInput> { version: number }
export type StreamState = 'ready' | 'starting' | 'live' | 'reconnecting' | 'stopping' | 'ended' | 'failed'
export interface StreamSession {
  id: string; streamId: string; state: Exclude<StreamState, 'ready'>
  desiredState: 'running' | 'stopped'; generation: number; attempts: number
  lastError: string | null; createdAt: string; lastHeartbeatAt: string | null; endedAt: string | null
  sourceInfo: { tracks: { kind: 'audio' | 'video'; codec: string; trackId?: string; width?: number; height?: number }[] }
  ingressBitrate: number; programBitrate: number
}
export interface StreamResource {
  id: string; organizationId: string; projectId: string; environmentId: string
  name: string; source: StreamSource; profile: StreamProfile
  maxDurationSeconds: number; retentionSeconds: number
  status: 'active' | 'deleting' | 'deleted'; version: number; playbackEpoch: number
  createdAt: string; updatedAt: string
}
export interface StreamDetail extends StreamResource { sessions: StreamSession[] }
export interface StreamListQuery { cursor?: string; limit?: number }
export interface StreamPage { data: StreamResource[]; nextCursor: string | null }
export interface IngestCredential { id: string; expiresAt: string; secret: string; protocol: 'whip' | 'rtmp'; url: string }
export interface PlaybackGrant { token: string; expiresAt: string; url: string }
export interface StreamPlayback {
  streamId: string; sourceSessionId: string | null; generation: number | null; state: StreamState
  profile: StreamProfile; protocols: ('hls' | 'll-hls')[]; grantRequired: true; grantTtlSeconds: number
  renewal: string; delivery: 'single-rendition-fmp4'; latencyTargetSeconds: null
}
export interface StreamingOperation {
  id: string; streamId: string; kind: 'start' | 'stop' | 'delete' | 'broadcast.start' | 'broadcast.stop' | 'broadcast.output.retry'
  broadcastId?: string | null
  outputId?: string | null
  sessionId: string | null
  status: 'pending' | 'completed' | 'failed'; errorCode: string | null
  createdAt: string; completedAt: string | null
}
export interface StreamingUsage {
  streamId: string; sourceSeconds: number; ingressBytes: number; programBytes: number
  coverage: 'observed' | 'partial'; samples: number
}
