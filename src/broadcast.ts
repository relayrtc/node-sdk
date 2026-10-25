import type { RecordingPolicy } from "./recording.js";
import type { DestinationSnapshot } from "./destination.js";
import type { StreamProfile, StreamSource } from "./streaming.js";

export type BroadcastState =
  | "created"
  | "waiting_for_source"
  | "starting"
  | "live"
  | "reconnecting"
  | "degraded"
  | "stopping"
  | "stopped"
  | "failed";
export interface CreateBroadcastInput {
  streamId: string;
  name: string;
  destinationIds?: string[];
  outputs?: { kind: "hls" }[];
  waitTimeoutSeconds?: number;
  maxDurationSeconds?: number;
}
export interface BroadcastCommandInput {
  version?: number;
}
export interface BroadcastResource {
  id: string;
  streamId: string;
  organizationId: string;
  projectId: string;
  environmentId: string;
  name: string;
  state: BroadcastState;
  desiredState: "idle" | "running" | "stopped";
  version: number;
  snapshot: {
    streamVersion: number;
    source: StreamSource;
    profile: StreamProfile;
    outputs: { kind: "hls" }[];
    destinations: DestinationSnapshot[];
    recording: false | RecordingPolicy;
  };
  sourceSessionId: string | null;
  sourceGeneration: number | null;
  waitTimeoutSeconds: number;
  maxDurationSeconds: number;
  lastError: string | null;
  correlationId: string | null;
  createdAt: string;
  startRequestedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}
export interface BroadcastOutput {
  id: string;
  broadcastId: string;
  kind: "hls" | "rtmp";
  destinationId: string | null;
  destinationName: string | null;
  outputSeconds: number;
  bytes: number;
  bitrate: number;
  droppedFrames: number;
  transcodeSeconds: number;
  state:
    | "queued"
    | "running"
    | "retry"
    | "stopping"
    | "completed"
    | "failed"
    | "cancelled";
  attempts: number;
  fence: number;
  lastError: string | null;
  lastHeartbeatAt: string | null;
  sourceSessionId: string | null;
  sourceGeneration: number | null;
}
export interface BroadcastUsage {
  bytes: number;
  transcodeSeconds: number;
  runSeconds: number;
  outputSeconds: number;
  reservationSeconds: number;
  samples: number;
  coverage: "observed" | "partial";
}
export interface BroadcastDetail extends BroadcastResource {
  usage: BroadcastUsage;
}
export interface ListBroadcastsQuery {
  cursor?: string;
  limit?: number;
  streamId?: string;
  state?: BroadcastState;
}
export interface BroadcastPage {
  data: BroadcastResource[];
  nextCursor: string | null;
  limits: {
    activeRuns: number;
    maxActiveRuns: number;
    reservedOutputs: number;
  };
}
