import { Buffer } from 'node:buffer'
import { RelayApiError } from './errors.js'
import type { RelayServerOptions, RequestOptions, RetryOptions } from './types.js'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export interface HttpResult<T> { readonly status: number; readonly data: T }

const retryableStatus = (status: number): boolean =>
  status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599)

const integer = (value: number, min: number, max: number, name: string): number => {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RelayApiError('INVALID_CONFIGURATION', `${name} must be an integer from ${min} to ${max}`)
  }
  return value
}

export function resourceId(value: string): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128
    || !/^\S+$/u.test(value) || value === '.' || value === '..') {
    throw new RelayApiError('INVALID_REQUEST', 'Provide a valid resource ID')
  }
  return encodeURIComponent(value)
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export class HttpTransport {
  readonly #baseUrl: URL
  readonly #apiKey: string
  readonly #fetch: typeof globalThis.fetch
  readonly #timeoutMs: number
  readonly #maxAttempts: number
  readonly #initialDelayMs: number
  readonly #maxDelayMs: number
  readonly #maxResponseBytes: number

  constructor(options: RelayServerOptions) {
    try {
      this.#baseUrl = new URL(options.apiUrl)
    } catch {
      throw new RelayApiError('INVALID_CONFIGURATION', 'Provide a valid API URL')
    }
    if (!['http:', 'https:'].includes(this.#baseUrl.protocol)
      || this.#baseUrl.username || this.#baseUrl.password || this.#baseUrl.search || this.#baseUrl.hash) {
      throw new RelayApiError('INVALID_CONFIGURATION', 'Use an HTTP or HTTPS API URL without credentials, query or fragment')
    }
    const path = this.#baseUrl.pathname.replace(/\/+$/u, '')
    this.#baseUrl.pathname = `${path.endsWith('/v1') ? path : `${path}/v1`}/`
    if (typeof options.apiKey !== 'string' || !/^rk_sk_[a-z0-9-]+_[A-Za-z0-9_-]{43}$/u.test(options.apiKey)) {
      throw new RelayApiError('INVALID_CONFIGURATION', 'Provide a RelayRTC secret API key')
    }
    this.#apiKey = options.apiKey
    this.#fetch = options.fetch ?? globalThis.fetch
    if (typeof this.#fetch !== 'function') {
      throw new RelayApiError('INVALID_CONFIGURATION', 'A fetch implementation is required')
    }
    this.#timeoutMs = integer(options.timeoutMs ?? 10_000, 1, 300_000, 'timeoutMs')
    const retry: RetryOptions = options.retry === false ? { maxAttempts: 1 } : options.retry ?? {}
    this.#maxAttempts = integer(retry.maxAttempts ?? 3, 1, 5, 'retry.maxAttempts')
    this.#initialDelayMs = integer(retry.initialDelayMs ?? 250, 0, 30_000, 'retry.initialDelayMs')
    this.#maxDelayMs = integer(retry.maxDelayMs ?? 2000, this.#initialDelayMs, 30_000, 'retry.maxDelayMs')
    this.#maxResponseBytes = integer(options.maxResponseBytes ?? 8 * 1024 * 1024, 1024, 32 * 1024 * 1024, 'maxResponseBytes')
  }

  async request<T>(method: HttpMethod, path: string, body?: object, query?: object, options: RequestOptions = {}): Promise<HttpResult<T>> {
    const url = new URL(path, this.#baseUrl)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) continue
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new RelayApiError('INVALID_REQUEST', 'Query values must be strings or numbers')
      }
      url.searchParams.set(key, String(value))
    }
    let serialized: string | undefined
    try {
      serialized = body === undefined ? undefined : JSON.stringify(body)
    } catch {
      throw new RelayApiError('INVALID_REQUEST', 'The request body must be JSON serializable')
    }
    const timeoutMs = integer(options.timeoutMs ?? this.#timeoutMs, 1, 300_000, 'timeoutMs')
    if (options.idempotencyKey !== undefined && !/^[A-Za-z0-9_.:-]{1,128}$/u.test(options.idempotencyKey)) {
      throw new RelayApiError('INVALID_REQUEST', 'Use an idempotency key of 1 to 128 letters, digits, dots, colons, underscores or hyphens')
    }
    const controller = new AbortController()
    const cancel = (): void => {
      controller.abort(new RelayApiError('REQUEST_CANCELLED', 'The API request was cancelled'))
    }
    options.signal?.addEventListener('abort', cancel, { once: true })
    if (options.signal?.aborted) cancel()
    const timer = setTimeout(() => {
      controller.abort(new RelayApiError('REQUEST_TIMEOUT', 'The API request timed out'))
    }, timeoutMs)
    const attempts = method === 'GET' && options.retry !== false ? this.#maxAttempts : 1
    try {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        this.#assertActive(controller.signal)
        let retryAfter: string | null = null
        try {
          const response = await this.#fetch(url, {
            method,
            headers: {
              authorization: `Bearer ${this.#apiKey}`,
              accept: 'application/json',
              ...(options.idempotencyKey === undefined ? {} : { 'idempotency-key': options.idempotencyKey }),
              ...(serialized === undefined ? {} : { 'content-type': 'application/json' }),
            },
            ...(serialized === undefined ? {} : { body: serialized }),
            signal: controller.signal,
            redirect: 'error',
          })
          retryAfter = response.headers.get('retry-after')
          const text = await this.#readBody(response)
          this.#assertActive(controller.signal)
          let data: unknown = null
          try {
            if (text) data = JSON.parse(text)
          } catch {
            if (response.ok) throw new RelayApiError('INVALID_RESPONSE', 'The API returned invalid JSON', { status: response.status })
          }
          if (!response.ok) {
            throw new RelayApiError(
              record(data) && typeof data.code === 'string' ? data.code : 'HTTP_ERROR',
              record(data) && typeof data.description === 'string' ? data.description : `The API returned HTTP ${response.status}`,
              {
                status: response.status,
                requestId: record(data) && typeof data.requestId === 'string' ? data.requestId : response.headers.get('x-request-id'),
                retryable: retryableStatus(response.status),
              },
            )
          }
          if (response.status !== 204 && !record(data)) {
            throw new RelayApiError('INVALID_RESPONSE', 'The API returned an unexpected response body', { status: response.status })
          }
          return { status: response.status, data: (response.status === 204 ? undefined : data) as T }
        } catch (error) {
          this.#assertActive(controller.signal)
          const failure = error instanceof RelayApiError
            ? error
            : new RelayApiError('NETWORK_ERROR', 'The API request failed before a response was received', { retryable: true })
          if (!failure.retryable || attempt === attempts) throw failure
          const delay = this.#retryDelay(retryAfter, attempt, timeoutMs)
          await this.#sleep(delay, controller.signal)
        }
      }
      throw new RelayApiError('NETWORK_ERROR', 'The API request failed')
    } finally {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', cancel)
    }
  }

  async #readBody(response: Response): Promise<string> {
    if (!response.body) return ''
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let bytes = 0
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        bytes += chunk.value.byteLength
        if (bytes > this.#maxResponseBytes) {
          await reader.cancel().catch(() => undefined)
          throw new RelayApiError('INVALID_RESPONSE', 'The API response exceeded the configured size limit', { status: response.status })
        }
        chunks.push(chunk.value)
      }
      return Buffer.concat(chunks).toString('utf8')
    } finally {
      reader.releaseLock()
    }
  }

  #retryDelay(retryAfter: string | null, attempt: number, timeoutMs: number): number {
    if (retryAfter !== null) {
      const seconds = /^\d+(?:\.\d+)?$/u.test(retryAfter.trim()) ? Number(retryAfter) : NaN
      const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now()
      if (Number.isFinite(delay) && delay >= 0) return Math.min(Math.ceil(delay), timeoutMs + 1)
    }
    return Math.min(this.#initialDelayMs * 2 ** (attempt - 1), this.#maxDelayMs)
  }

  #assertActive(signal: AbortSignal): void {
    if (signal.aborted) throw signal.reason
  }

  #sleep(delay: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        reject(signal.reason)
      }
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort)
        resolve()
      }, delay)
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
    })
  }
}
