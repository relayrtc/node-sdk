import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

export type WebhookHeaders = Headers | Readonly<Record<string, string | readonly string[] | undefined>>
export interface WebhookVerificationOptions {
  readonly now?: Date
  readonly toleranceSeconds?: number
}

function header(headers: WebhookHeaders, name: string): string {
  if (headers instanceof Headers) return headers.get(name) ?? ''
  const values = Object.entries(headers).filter(([key]) => key.toLowerCase() === name)
  const value = values.length === 1 ? values[0]?.[1] : undefined
  return typeof value === 'string' ? value : ''
}

export function verifyWebhookRequest(
  secret: string,
  rawBody: string | Uint8Array,
  headers: WebhookHeaders,
  options: WebhookVerificationOptions = {},
): boolean {
  const match = /^t=([1-9][0-9]{0,12}),v1=([a-f0-9]{64})$/u.exec(header(headers, 'x-relayrtc-signature'))
  const deliveryId = header(headers, 'x-relayrtc-delivery-id')
  const replayText = header(headers, 'x-relayrtc-replay-count')
  const timestamp = Number(match?.[1])
  const signature = match?.[2]
  const replayCount = Number(replayText)
  const tolerance = options.toleranceSeconds ?? 300
  const now = (options.now ?? new Date()).getTime() / 1000
  if (!/^whsec_[A-Za-z0-9_-]{43}$/u.test(secret) || !signature
    || !/^[A-Za-z0-9_-]{1,128}$/u.test(deliveryId)
    || !/^(0|[1-9][0-9]{0,2})$/u.test(replayText) || replayCount > 100
    || !Number.isSafeInteger(timestamp) || !Number.isFinite(now)
    || !Number.isInteger(tolerance) || tolerance < 1 || tolerance > 300
    || Math.abs(now - timestamp) > tolerance) return false
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${deliveryId}.${replayCount}.`, 'ascii')
    .update(rawBody)
    .digest()
  return timingSafeEqual(digest, Buffer.from(signature, 'hex'))
}
