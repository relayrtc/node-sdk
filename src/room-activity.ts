export interface RoomActivityPolicy {
  readonly version: number
  readonly activityEnabled: boolean
  readonly speakersEnabled: boolean
  readonly idleSeconds: number
  readonly heartbeatSeconds: number
}
export interface RoomActivitySnapshot {
  readonly roomId: string
  readonly observedAt: string
  readonly policy: RoomActivityPolicy
  readonly participants: readonly {
    readonly participantId: string
    readonly state: 'online' | 'away' | 'inactive' | 'unknown' | 'hidden'
  }[]
  readonly truncated: boolean
  readonly speakers: readonly {
    readonly participantId: string
    readonly level: number
  }[]
  readonly dominantSpeakerId: string | null
  readonly speakerState: 'available' | 'unavailable' | 'disabled'
}
