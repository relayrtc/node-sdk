import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RelayServer, RelayApiError } from '../dist/index.js'

test('tokens.renew uses the public authenticated endpoint and preserves its response', async () => {
  let called = 0
  const input = { participantToken: 'old-participant-token', sessionId: 'session_test', ttlSeconds: 600 }
  const result = { token: 'new-participant-token', tokenId: 'ptok_new', participantId: 'participant_original', expiresAt: '2026-10-22T13:00:00Z' }
  const relay = new RelayServer({ apiUrl: 'https://relay.test/v1', apiKey: `rk_sk_test_${'a'.repeat(43)}`,
    fetch: async (url, init) => {
      called++
      assert.equal(String(url), 'https://relay.test/v1/rooms/room_test/tokens/renew')
      assert.equal(init.method, 'POST')
      assert.deepEqual(JSON.parse(init.body), input)
      assert.match(new Headers(init.headers).get('authorization'), /^Bearer rk_sk_/)
      return Response.json(result)
    },
  })
  assert.deepEqual(await relay.tokens.renew('room_test', input), result)
  assert.equal(called, 1)
})

test('renewal rejection is surfaced without creating a new identity or blindly retrying', async () => {
  let called = 0
  const relay = new RelayServer({ apiUrl: 'https://relay.test', apiKey: `rk_sk_test_${'a'.repeat(43)}`,
    fetch: async () => { called++; return Response.json({ code: 'PARTICIPANT_SESSION_NOT_ACTIVE', description: 'Session removed' }, { status: 403 }) },
  })
  await assert.rejects(relay.tokens.renew('room_test', { participantToken: 'old', sessionId: 'session_test' }),
    error => error instanceof RelayApiError && error.status === 403 && error.code === 'PARTICIPANT_SESSION_NOT_ACTIVE')
  assert.equal(called, 1)
})
