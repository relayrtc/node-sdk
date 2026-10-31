export interface RoomLifecycle {
  readonly roomId: string
  readonly version: number
  readonly locked: boolean
  readonly endsAt: string | null
  readonly warning: boolean
  readonly serverTime: string
}

export interface UpdateRoomLifecycle {
  readonly version: number
  readonly locked: boolean
  readonly endsAt: string | null
}

export interface CreateRoomInvitation {
  readonly expiresAt: string
  readonly maxUses: number
  readonly identity: string | null
  readonly permissions: readonly ('room:join' | 'audio:publish' | 'video:publish' | 'screen:publish' | 'messages:send' | 'metadata:update')[]
}

export interface RoomInvitation extends CreateRoomInvitation {
  readonly id: string
  readonly roomId: string
  readonly uses: number
  readonly revokedAt: string | null
  readonly createdAt: string
}

export interface RedeemRoomInvitation {
  readonly secret: string
  readonly redemptionId: string
  readonly identity: string
  readonly participantName: string
}
