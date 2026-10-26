/** Streaming service measurements, separate from room/participant usage metrics. */
export type ServiceUsageMetric =
  | 'sourceSeconds' | 'sourceEncodeSeconds' | 'sourceRemuxSeconds' | 'sourceComposeFrames'
  | 'roomExportBytes' | 'externalIngressBytes' | 'programBytes'
  | 'outputSeconds' | 'outputReservationSeconds' | 'externalOutputBytes' | 'externalTranscodeSeconds'
  | 'viewerSeconds' | 'peakConcurrentViewers' | 'liveDeliveryBytes' | 'recordingDeliveryBytes'
  | 'clipDeliveryBytes' | 'dvrDeliveryBytes' | 'abortedDeliveryBytes'
  | 'recordingProcessingSeconds' | 'clipProcessingSeconds' | 'recordingFinalizations' | 'clipFinalizations'
  | 'mixerRenderSeconds' | 'mixerProgramSeconds' | 'mixerInputSeconds' | 'mixerFrames'
  | 'externalFetchBytes' | 'externalProcessingSeconds'
  | 'recordingStoredBytes' | 'recordingStorageByteSeconds'
  | 'clipStoredBytes' | 'clipStorageByteSeconds' | 'bufferStoredBytes' | 'bufferStorageByteSeconds'

export type ServiceUsageMetrics = Readonly<Record<ServiceUsageMetric, number>>
export type ServiceUsageCoverage = 'observed' | 'estimated' | 'partial' | 'unavailable'
export type ServiceUsageMetricCoverage = Readonly<Record<ServiceUsageMetric, ServiceUsageCoverage>>

export interface ServiceUsageMetricDefinition {
  readonly category: 'sources' | 'broadcasts' | 'viewers' | 'recordings' | 'clips' | 'dvr' | 'mixers' | 'external-sources'
  readonly unit: 'seconds' | 'bytes' | 'byte-seconds' | 'frames' | 'count' | 'viewers'
  readonly attribution: 'interval' | 'event' | 'gauge' | 'peak'
  readonly aggregation: 'sum' | 'gauge' | 'peak'
  readonly definition: string
  readonly source: string
  readonly pricing: 'unpriced'
}

export interface ServiceUsageResource {
  readonly resourceType: string
  readonly resourceId: string
  readonly streamId: string
  readonly metrics: ServiceUsageMetrics
  readonly metricCoverage: ServiceUsageMetricCoverage
  readonly coverage: ServiceUsageCoverage
}

export interface ServiceUsageProject {
  readonly projectId: string
  readonly metrics: ServiceUsageMetrics
  readonly metricCoverage: ServiceUsageMetricCoverage
  readonly coverage: ServiceUsageCoverage
}

export interface ServiceUsageReport {
  readonly window: {
    readonly startedAt: string
    readonly endedAt: string
    readonly timezone: 'UTC'
    readonly endExclusive: true
    readonly granularity: 'hour' | 'day'
  }
  readonly summary: ServiceUsageMetrics
  readonly metricDefinitions: Readonly<Record<ServiceUsageMetric, ServiceUsageMetricDefinition>>
  readonly rules: Readonly<Record<string, string>>
  readonly buckets: readonly {
    readonly startedAt: string
    readonly endedAt: string
    readonly metrics: ServiceUsageMetrics
  }[]
  readonly coverage: ServiceUsageMetricCoverage
  readonly journalStartedAt: string
  readonly historicalCoverage: 'complete' | 'partial'
  readonly deliveryAuthority: 'origin'
  readonly pricing: 'unpriced'
  readonly resources: readonly ServiceUsageResource[]
  readonly projects: readonly ServiceUsageProject[]
  readonly resourceLimit: 100
  readonly resourcesTruncated: boolean
}
