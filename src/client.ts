import { RelayApiError } from './errors.js'
import { HttpTransport, resourceId } from './transport.js'
import type { HttpMethod } from './transport.js'
import type {
  ApiContext, CleanupResult, CreateParticipantTokenInput, CreateRoomInput, CreateTurnCredentialsInput,
  CreateWebhookInput, CursorPage, ListParticipantsQuery, ListRoomsQuery, ListWebhookDeliveriesQuery,
  OffsetQuery, Participant, ParticipantToken, RelayServerOptions, ReplayWebhookDeliveryInput,
  RequestOptions, RevealedWebhookEndpoint, Room, RuntimeOperation, TurnCredentials,
  UpdateWebhookInput, UsageQuery, UsageResponse, WebhookDelivery, WebhookDeliveryDetail,
  WebhookDeliveryList, WebhookEndpoint, WebhookEndpointList, WebhookScopeQuery, WebhookSignatureContract,
} from './types.js'

export class RelayServer {
  readonly #http: HttpTransport

  constructor(options: RelayServerOptions) {
    this.#http = new HttpTransport(options)
  }

  context(options?: RequestOptions): Promise<ApiContext> {
    return this.#data('GET', '', undefined, undefined, options)
  }

  readonly rooms = {
    create: async (input: CreateRoomInput, options?: RequestOptions): Promise<Room> =>
      this.#data('POST', 'rooms', input, undefined, options),
    list: async (query: ListRoomsQuery = {}, options?: RequestOptions): Promise<CursorPage<Room>> =>
      this.#data('GET', 'rooms', undefined, query, options),
    get: async (roomId: string, options?: RequestOptions): Promise<Room> =>
      this.#data('GET', `rooms/${resourceId(roomId)}`, undefined, undefined, options),
    end: async (roomId: string, options?: RequestOptions): Promise<CleanupResult> =>
      this.#cleanup(`rooms/${resourceId(roomId)}`, options),
    getRuntimeOperation: async (roomId: string, options?: RequestOptions): Promise<RuntimeOperation> =>
      this.#data('GET', `rooms/${resourceId(roomId)}/runtime-operation`, undefined, undefined, options),
  }

  readonly tokens = {
    create: async (roomId: string, input: CreateParticipantTokenInput, options?: RequestOptions): Promise<ParticipantToken> =>
      this.#data('POST', `rooms/${resourceId(roomId)}/tokens`, input, undefined, options),
  }

  readonly participants = {
    list: async (roomId: string, query: ListParticipantsQuery = {}, options?: RequestOptions): Promise<CursorPage<Participant>> =>
      this.#data('GET', `rooms/${resourceId(roomId)}/participants`, undefined, query, options),
    get: async (roomId: string, participantId: string, options?: RequestOptions): Promise<Participant> =>
      this.#data('GET', this.#participantPath(roomId, participantId), undefined, undefined, options),
    remove: async (roomId: string, participantId: string, options?: RequestOptions): Promise<CleanupResult> =>
      this.#cleanup(this.#participantPath(roomId, participantId), options),
    getRuntimeOperation: async (roomId: string, participantId: string, options?: RequestOptions): Promise<RuntimeOperation> =>
      this.#data('GET', `${this.#participantPath(roomId, participantId)}/runtime-operation`, undefined, undefined, options),
  }

  readonly turn = {
    createCredentials: async (input: CreateTurnCredentialsInput = {}, options?: RequestOptions): Promise<TurnCredentials> => {
      if ((input.roomId === undefined) !== (input.sessionId === undefined)) {
        throw new RelayApiError('INVALID_REQUEST', 'Provide roomId and sessionId together')
      }
      return this.#data('POST', 'turn/credentials', input, undefined, options)
    },
  }

  readonly usage = {
    get: async (query: UsageQuery = {}, options?: RequestOptions): Promise<UsageResponse> => {
      const { category = 'all', ...parameters } = query
      if (!['all', 'rooms', 'participants', 'sfu', 'turn', 'signaling', 'screen-share'].includes(category)) {
        throw new RelayApiError('INVALID_REQUEST', 'Provide a supported usage category')
      }
      return this.#data('GET', category === 'all' ? 'usage' : `usage/${category}`, undefined, parameters, options)
    },
  }

  readonly webhooks = {
    create: async (input: CreateWebhookInput, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<RevealedWebhookEndpoint> =>
      this.#data('POST', 'webhooks', input, scope, options),
    list: async (query: OffsetQuery = {}, options?: RequestOptions): Promise<WebhookEndpointList> =>
      this.#data('GET', 'webhooks', undefined, query, options),
    get: async (endpointId: string, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<WebhookEndpoint> =>
      this.#data('GET', `webhooks/${resourceId(endpointId)}`, undefined, scope, options),
    update: async (endpointId: string, input: UpdateWebhookInput, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<WebhookEndpoint> =>
      this.#data('PATCH', `webhooks/${resourceId(endpointId)}`, input, scope, options),
    remove: async (endpointId: string, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<void> =>
      this.#data('DELETE', `webhooks/${resourceId(endpointId)}`, undefined, scope, options),
    rotateSecret: async (endpointId: string, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<RevealedWebhookEndpoint> =>
      this.#data('POST', `webhooks/${resourceId(endpointId)}/rotate-secret`, {}, scope, options),
    signatureContract: async (scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<WebhookSignatureContract> =>
      this.#data('GET', 'webhooks/signature-contract', undefined, scope, options),
    deliveries: {
      list: async (endpointId: string, query: ListWebhookDeliveriesQuery = {}, options?: RequestOptions): Promise<WebhookDeliveryList> =>
        this.#data('GET', `webhooks/${resourceId(endpointId)}/deliveries`, undefined, query, options),
      get: async (endpointId: string, deliveryId: string, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<WebhookDeliveryDetail> =>
        this.#data('GET', this.#deliveryPath(endpointId, deliveryId), undefined, scope, options),
      replay: async (endpointId: string, deliveryId: string, input: ReplayWebhookDeliveryInput, scope: WebhookScopeQuery = {}, options?: RequestOptions): Promise<WebhookDelivery> => {
        if (!Number.isInteger(input.expectedReplayCount) || input.expectedReplayCount < 0 || input.expectedReplayCount > 99) {
          throw new RelayApiError('INVALID_REQUEST', 'expectedReplayCount must be an integer from 0 to 99')
        }
        return this.#data('POST', `${this.#deliveryPath(endpointId, deliveryId)}/replay`, input, scope, options)
      },
    },
  }

  async #data<T>(method: HttpMethod, path: string, body?: object, query?: object, options?: RequestOptions): Promise<T> {
    return (await this.#http.request<T>(method, path, body, query, options)).data
  }

  async #cleanup(path: string, options?: RequestOptions): Promise<CleanupResult> {
    const result = await this.#http.request<RuntimeOperation>('DELETE', path, undefined, undefined, options)
    if (result.status === 204) return { status: 'completed', httpStatus: 204 }
    if (result.status === 202 && typeof result.data?.id === 'string'
      && ['pending', 'running', 'failed', 'completed'].includes(result.data.status)) {
      return { status: 'pending', httpStatus: 202, operation: result.data }
    }
    throw new RelayApiError('INVALID_RESPONSE', 'Expected a completed cleanup or a pending runtime operation', { status: result.status })
  }

  #participantPath(roomId: string, participantId: string): string {
    return `rooms/${resourceId(roomId)}/participants/${resourceId(participantId)}`
  }

  #deliveryPath(endpointId: string, deliveryId: string): string {
    return `webhooks/${resourceId(endpointId)}/deliveries/${resourceId(deliveryId)}`
  }
}
