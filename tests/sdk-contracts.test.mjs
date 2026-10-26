import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RelayServer, RelayApiError, recordingEventTypes, scheduleEventTypes } from '../dist/index.js'

const apiKey = `rk_sk_test_${'a'.repeat(43)}`
const timestamp = '2026-10-25T12:00:00.000Z'

function mockRelay(response, inspect) {
  return new RelayServer({
    apiUrl: 'https://relay.test/v1',
    apiKey,
    fetch: async (url, init) => {
      inspect(new URL(url), init)
      return Response.json(response)
    },
  })
}

test('room filters serialize both joinable values and preserve search/pagination', async () => {
  for (const joinable of [true, false]) {
    let requests = 0
    const page = { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } }
    const relay = mockRelay(page, (url, init) => {
      requests++
      assert.equal(init.method, 'GET')
      assert.equal(url.pathname, '/v1/rooms')
      assert.equal(url.searchParams.get('search'), 'Planning & review')
      assert.equal(url.searchParams.get('joinable'), String(joinable))
      assert.equal(url.searchParams.get('status'), 'active')
      assert.equal(url.searchParams.get('cursor'), 'room_next')
      assert.equal(url.searchParams.get('limit'), '20')
    })
    assert.deepEqual(await relay.rooms.list({
      search: 'Planning & review', joinable, status: 'active', cursor: 'room_next', limit: 20,
    }), page)
    assert.equal(requests, 1)
  }
})

test('room listing omits joinable when no filter was supplied', async () => {
  const relay = mockRelay({ nodes: [], pageInfo: { hasNextPage: false, endCursor: null } }, url => {
    assert.equal(url.search, '')
  })
  await relay.rooms.list()
})

test('broadcast ordering, activity flags and cursors reach the API unchanged', async () => {
  const page = { data: [], nextCursor: null, limits: { activeRuns: 0, maxActiveRuns: 4, reservedOutputs: 0 } }
  for (const activeOnly of [true, false]) {
    const relay = mockRelay(page, (url, init) => {
      assert.equal(init.method, 'GET')
      assert.equal(url.pathname, '/v1/broadcasts')
      assert.equal(url.searchParams.get('order'), 'newest')
      assert.equal(url.searchParams.get('activeOnly'), String(activeOnly))
      assert.equal(url.searchParams.get('cursor'), 'run_previous')
      assert.equal(url.searchParams.get('streamId'), 'stream_test')
    })
    assert.deepEqual(await relay.broadcasts.list({
      order: 'newest', activeOnly, cursor: 'run_previous', streamId: 'stream_test',
    }), page)
  }
})

test('query serialization still rejects object filters before fetch', async () => {
  const relay = new RelayServer({ apiUrl: 'https://relay.test', apiKey,
    fetch: async () => { throw new Error('Object filters must not reach fetch') },
  })
  await assert.rejects(relay.rooms.list({ search: { contains: 'Planning' } }),
    error => error instanceof RelayApiError && error.code === 'INVALID_REQUEST')
})

test('clip listing supports key-scoped and stream-scoped pagination without console scope fields', async () => {
  const page = { data: [], nextCursor: null }
  const paths = []
  const relay = mockRelay(page, (url, init) => {
    paths.push(url.pathname)
    assert.equal(init.method, 'GET')
    assert.equal(url.searchParams.get('cursor'), 'clip_previous')
    assert.equal(url.searchParams.get('limit'), '20')
    assert.equal(url.searchParams.has('projectId'), false)
    assert.equal(url.searchParams.has('environmentId'), false)
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${apiKey}`)
  })
  assert.deepEqual(await relay.clips.list({ cursor: 'clip_previous', limit: 20 }), page)
  assert.deepEqual(await relay.streams.clips.list('stream_test', { cursor: 'clip_previous', limit: 20 }), page)
  assert.deepEqual(paths, ['/v1/clips', '/v1/streams/stream_test/clips'])
})

test('ingest creation and rotation send TTL input independently of viewer grant options', async () => {
  const credential = {
    id: 'ingest_replacement', expiresAt: timestamp, secret: 'encoder-secret',
    protocol: 'whip', url: 'https://relay.test/v1/ingest/whip/stream_test',
  }
  const created = mockRelay(credential, (url, init) => {
    assert.equal(url.pathname, '/v1/streams/stream_test/ingest-credentials')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), { ttlSeconds: 600 })
    assert.equal(new Headers(init.headers).get('idempotency-key'), 'create-ingest-1')
  })
  assert.deepEqual(await created.streams.createIngestCredentials(
    'stream_test', { ttlSeconds: 600 }, { idempotencyKey: 'create-ingest-1' },
  ), credential)

  const rotated = {
    ...credential,
    handover: { policy: 'disconnect-and-reconnect', status: 'pending', retryAfterSeconds: 2 },
  }
  const rotation = mockRelay(rotated, (url, init) => {
    assert.equal(url.pathname, '/v1/streams/stream_test/ingest-credentials/ingest_old/rotate')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), {})
    assert.equal(new Headers(init.headers).get('idempotency-key'), 'rotate-ingest-1')
  })
  assert.deepEqual(await rotation.streams.rotateIngestCredentials(
    'stream_test', 'ingest_old', {}, { idempotencyKey: 'rotate-ingest-1' },
  ), rotated)
})

test('credential listing returns the secret-free API list without a pagination wrapper', async () => {
  const list = { data: [
    { id: 'ingest_active', expiresAt: timestamp, revokedAt: null, createdAt: timestamp },
    { id: 'ingest_rotated', expiresAt: timestamp, revokedAt: timestamp, createdAt: timestamp },
  ] }
  const relay = mockRelay(list, (url, init) => {
    assert.equal(url.pathname, '/v1/streams/stream_test/ingest-credentials')
    assert.equal(url.search, '')
    assert.equal(init.method, 'GET')
    assert.equal(init.body, undefined)
    assert.equal(new Headers(init.headers).get('idempotency-key'), null)
  })
  assert.deepEqual(await relay.streams.listIngestCredentials('stream_test'), list)
})

test('DVR viewer grants retain mode and broadcast selection', async () => {
  const grant = { token: 'viewer-token', expiresAt: timestamp, url: 'https://relay.test/dvr.m3u8' }
  const relay = mockRelay(grant, (url, init) => {
    assert.equal(url.pathname, '/v1/streams/stream_test/playback-grants')
    assert.equal(init.method, 'POST')
    assert.deepEqual(JSON.parse(init.body), { ttlSeconds: 120, mode: 'dvr', broadcastId: 'run_test' })
  })
  assert.deepEqual(await relay.streams.createPlaybackGrant(
    'stream_test', { ttlSeconds: 120, mode: 'dvr', broadcastId: 'run_test' },
  ), grant)
})

test('playback preserves distinct source and viewer readiness states', async () => {
  const playback = {
    streamId: 'stream_test', sourceSessionId: 'source_test', generation: 2,
    state: 'reconnecting', sourceState: 'live',
    readiness: {
      status: 'degraded', publisherConnected: true, sourceProducing: true,
      outputStarting: true, viewerReady: false, code: 'PLAYBACK_NOT_READY', checkedAt: timestamp,
    },
    profile: { audioOnly: false, width: 1280, height: 720, fps: 30,
      videoBitrate: 2500000, audioBitrate: 128000, layout: 'single' },
    protocols: ['hls', 'll-hls'], grantRequired: true, grantTtlSeconds: 300,
    renewal: 'POST /v1/streams/{streamId}/playback-grants',
    delivery: 'single-rendition-fmp4', latencyTargetSeconds: null,
  }
  const relay = mockRelay(playback, url => {
    assert.equal(url.pathname, '/v1/streams/stream_test/playback')
  })
  assert.deepEqual(await relay.streams.getPlayback('stream_test'), playback)
})

test('source command and operation reads preserve their nullable operation fields', async () => {
  const sourceOperation = {
    id: 'operation_test', streamId: 'stream_test', sessionId: null, kind: 'stop',
    status: 'pending', errorCode: null, createdAt: timestamp, completedAt: null,
  }
  const command = mockRelay(sourceOperation, (url, init) => {
    assert.equal(url.pathname, '/v1/streams/stream_test/stop')
    assert.equal(init.method, 'POST')
  })
  assert.deepEqual(await command.streams.stop('stream_test'), sourceOperation)

  const observed = { ...sourceOperation, broadcastId: null, outputId: null }
  const reader = mockRelay(observed, (url, init) => {
    assert.equal(url.pathname, '/v1/streaming-operations/operation_test')
    assert.equal(init.method, 'GET')
  })
  assert.deepEqual(await reader.streamingOperations.get('operation_test'), observed)
})

test('streaming usage routes to its category and preserves the separate service report', async () => {
  const report = {
    category: 'streaming', summary: {}, buckets: [], metricDefinitions: {},
    serviceUsage: { pricing: 'unpriced', deliveryAuthority: 'origin',
      resourcesTruncated: true, resourceLimit: 100, historicalCoverage: 'partial' },
  }
  const relay = mockRelay(report, (url, init) => {
    assert.equal(url.pathname, '/v1/usage/streaming')
    assert.equal(init.method, 'GET')
    assert.equal(url.searchParams.get('range'), '24h')
    assert.equal(url.searchParams.get('granularity'), 'hour')
    assert.equal(url.searchParams.has('category'), false)
  })
  assert.deepEqual(await relay.usage.get({ category: 'streaming', range: '24h', granularity: 'hour' }), report)
})

test('unsupported usage categories still fail before a request', async () => {
  const relay = new RelayServer({ apiUrl: 'https://relay.test', apiKey,
    fetch: async () => { throw new Error('An invalid category must not reach fetch') },
  })
  await assert.rejects(relay.usage.get({ category: 'invalid' }),
    error => error instanceof RelayApiError && error.code === 'INVALID_REQUEST')
})

test('recording and schedule event constants are available at the package runtime entrypoint', () => {
  assert.equal(recordingEventTypes.includes('recording.ready'), true)
  assert.equal(scheduleEventTypes.includes('schedule.reminder'), true)
})
