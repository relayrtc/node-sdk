export interface RelayApiErrorOptions {
  readonly status?: number | null
  readonly requestId?: string | null
  readonly retryable?: boolean
  readonly retryAfterMs?: number | null
}

export class RelayApiError extends Error {
  readonly status: number | null
  readonly requestId: string | null
  readonly retryable: boolean
  readonly retryAfterMs: number | null

  constructor(readonly code: string, message: string, options: RelayApiErrorOptions = {}) {
    super(message)
    this.name = 'RelayApiError'
    this.status = options.status ?? null
    this.requestId = options.requestId ?? null
    this.retryable = options.retryable ?? false
    this.retryAfterMs = options.retryAfterMs ?? null
  }
}
