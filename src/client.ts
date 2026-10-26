import type {GuestResource,GuestStage,GuestRoster,GuestJoinGrant,GuestDecision,InviteGuestInput,RequestGuestInput,AudienceGrantInput,GuestStageInput} from "./guest.js";
import type { DvrPolicy, DvrPolicyResource, DvrPlayback } from "./dvr.js";
import type {MixerResource,MixerSceneResource,MixerOverlay,MixerOperation,MixerCommandResult,CreateMixerInput,PutMixerSceneInput,ActivateMixerSceneInput,CreateMixerOverlayInput} from "./mixer.js";
import type {ClipResource, ClipListQuery, ClipPage, CreateClipInput, ClipWindow, RollingBufferPolicy} from "./clip.js";
import type {RestreamSource, RestreamDetail, CreateRestreamSourceInput, UpdateRestreamSourceInput} from "./restream.js";
import type { ScheduledBroadcast, CreateScheduleInput, UpdateScheduleInput, SchedulePage, ScheduleOperation, ScheduledPlayback } from "./schedule.js";
import type { RecordingPolicy, StartRecordingInput, RecordingResource, RecordingPage, RecordingPlayback, MediaAsset, AssetAccessGrant } from "./recording.js";
import type { CreateDestinationInput, UpdateDestinationInput, RotateDestinationSecretInput, StreamDestination, DestinationPage } from './destination.js'
import { RelayApiError } from './errors.js'
import { randomUUID } from 'node:crypto'
import type { CreateBroadcastInput, BroadcastCommandInput, BroadcastResource, BroadcastDetail, ListBroadcastsQuery, BroadcastPage, BroadcastOutput } from './broadcast.js'
import { HttpTransport, resourceId } from './transport.js'
import type { HttpMethod } from './transport.js'
import type {
  CreateStreamInput, UpdateStreamInput, StreamResource, StreamDetail, StreamListQuery, StreamPage,
  CreateIngestCredentialInput, IngestCredential, IngestCredentialList, RotatedIngestCredential,
  CreatePlaybackGrantInput, PlaybackGrant, StreamPlayback, StreamingOperation, StreamingUsage,
} from './streaming.js'
import type {
  ApiContext, CleanupResult, CreateParticipantTokenInput, CreateRoomInput, CreateTurnCredentialsInput,
  RenewParticipantTokenInput,
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

  readonly clips = {
    list: (query: ClipListQuery = {}, options?: RequestOptions): Promise<ClipPage> =>
      this.#data('GET', 'clips', undefined, query, options),
    get: (clipId:string,options?:RequestOptions):Promise<ClipResource> => this.#data('GET',`clips/${resourceId(clipId)}`,undefined,undefined,options),
    publish: (clipId:string,options?:RequestOptions):Promise<ClipResource> => this.#streamCommand('POST',`clips/${resourceId(clipId)}/publish`,{},options),
    delete: (clipId:string,options?:RequestOptions):Promise<ClipResource> => this.#streamCommand('DELETE',`clips/${resourceId(clipId)}`,undefined,options),
  }
  readonly streams = {
    guests: {
      getStage: (streamId:string,broadcastId:string,options?:RequestOptions):Promise<GuestStage> => this.#data('GET',guestPath(streamId,broadcastId,'guest-stage'),undefined,undefined,options),
      configureStage: (streamId:string,broadcastId:string,input:GuestStageInput,options?:RequestOptions):Promise<GuestStage> => this.#streamCommand('PUT',guestPath(streamId,broadcastId,'guest-stage'),input,options),
      createAudienceGrant: (streamId:string,broadcastId:string,input:AudienceGrantInput,options?:RequestOptions):Promise<{token:string;expiresAt:string;audienceId:string}> => this.#streamCommand('POST',guestPath(streamId,broadcastId,'audience-grants'),input,options),
      invite: (streamId:string,broadcastId:string,input:InviteGuestInput,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,'invites'),input,options),
      requestJoin: (streamId:string,broadcastId:string,input:RequestGuestInput,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,'guest-requests'),input,options),
      listInvites: (streamId:string,broadcastId:string,query:{cursor?:string;limit?:number}={},options?:RequestOptions):Promise<GuestRoster> => this.#data('GET',guestPath(streamId,broadcastId,'invites'),undefined,query,options),
      listRequests: (streamId:string,broadcastId:string,query:{cursor?:string;limit?:number}={},options?:RequestOptions):Promise<GuestRoster> => this.#data('GET',guestPath(streamId,broadcastId,'guest-requests'),undefined,query,options),
      list: (streamId:string,broadcastId:string,query:{cursor?:string;limit?:number}={},options?:RequestOptions):Promise<GuestRoster> => this.#data('GET',guestPath(streamId,broadcastId,'guests'),undefined,query,options),
      getStatus: (streamId:string,broadcastId:string,query:{subject:string;cursor?:string;limit?:number},options?:RequestOptions):Promise<GuestRoster> => this.#data('GET',guestPath(streamId,broadcastId,'guest-status'),undefined,query,options),
      acceptInvite: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`invites/${resourceId(guestId)}/accept`),input,options),
      declineInvite: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`invites/${resourceId(guestId)}/decline`),input,options),
      cancelInvite: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`invites/${resourceId(guestId)}/cancel`),input,options),
      approveRequest: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`guest-requests/${resourceId(guestId)}/approve`),input,options),
      rejectRequest: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`guest-requests/${resourceId(guestId)}/reject`),input,options),
      leave: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`guests/${resourceId(guestId)}/leave`),input,options),
      remove: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`guests/${resourceId(guestId)}/remove`),input,options),
      mute: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision & {audio?:boolean;video?:boolean},options?:RequestOptions):Promise<GuestResource> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`guests/${resourceId(guestId)}/mute`),input,options),
      createJoinGrant: (streamId:string,broadcastId:string,guestId:string,input:GuestDecision,options?:RequestOptions):Promise<GuestJoinGrant> => this.#streamCommand('POST',guestPath(streamId,broadcastId,`guests/${resourceId(guestId)}/join-grant`),input,options),
    },
    dvr: {
      configure: (streamId:string,input:{policy:DvrPolicy},options?:RequestOptions):Promise<DvrPolicyResource> => this.#streamCommand('POST',`streams/${resourceId(streamId)}/dvr-policy`,input,options),
      getPolicy: (streamId:string,options?:RequestOptions):Promise<DvrPolicyResource> => this.#data('GET',`streams/${resourceId(streamId)}/dvr-policy`,undefined,undefined,options),
      updatePolicy: (streamId:string,input:{policy:DvrPolicy;version:number},options?:RequestOptions):Promise<DvrPolicyResource> => this.#streamCommand('PATCH',`streams/${resourceId(streamId)}/dvr-policy`,input,options),
      getPlayback: (streamId:string,query:{broadcastId?:string}={},options?:RequestOptions):Promise<DvrPlayback> => this.#data('GET',`streams/${resourceId(streamId)}/dvr-playback`,undefined,query,options),
    },
    clips: {
      create: (streamId:string,input:CreateClipInput,options?:RequestOptions):Promise<ClipResource> => this.#streamCommand('POST',`streams/${resourceId(streamId)}/clips`,input,options),
      list: (streamId:string,query:ClipListQuery={},options?:RequestOptions):Promise<ClipPage> => this.#data('GET',`streams/${resourceId(streamId)}/clips`,undefined,query,options),
      getWindow: (streamId:string,options?:RequestOptions):Promise<{data:ClipWindow[]}> => this.#data('GET',`streams/${resourceId(streamId)}/clip-window`,undefined,undefined,options),
      getBufferPolicy: (streamId:string,options?:RequestOptions):Promise<{policy:RollingBufferPolicy|null;version:number}> => this.#data('GET',`streams/${resourceId(streamId)}/buffer-policy`,undefined,undefined,options),
      setBufferPolicy: (streamId:string,input:{policy:RollingBufferPolicy;version:number},options?:RequestOptions):Promise<{policy:RollingBufferPolicy;version:number}> => this.#streamCommand('PUT',`streams/${resourceId(streamId)}/buffer-policy`,input,options),
    },
    recordings: {
      start: (streamId: string, input: StartRecordingInput, options?: RequestOptions): Promise<RecordingResource> => this.#streamCommand('POST', `streams/${resourceId(streamId)}/recordings`, input, options),
      list: (streamId: string, query: { cursor?: string; limit?: number } = {}, options?: RequestOptions): Promise<RecordingPage> => this.#data('GET', `streams/${resourceId(streamId)}/recordings`, undefined, query, options),
      getPolicy: (streamId: string, options?: RequestOptions): Promise<{policy: RecordingPolicy | null; version: number}> => this.#data('GET', `streams/${resourceId(streamId)}/recording-policy`, undefined, undefined, options),
      setPolicy: (streamId: string, input: {policy: RecordingPolicy; version: number}, options?: RequestOptions): Promise<{policy: RecordingPolicy; version: number}> => this.#streamCommand('PUT', `streams/${resourceId(streamId)}/recording-policy`, input, options),
    },

    destinations: {
      create: (streamId: string, input: CreateDestinationInput, options?: RequestOptions): Promise<StreamDestination> => this.#streamCommand('POST', `streams/${resourceId(streamId)}/destinations`, input, options),
      list: (streamId: string, query: { cursor?: string; limit?: number } = {}, options?: RequestOptions): Promise<DestinationPage> => this.#data('GET', `streams/${resourceId(streamId)}/destinations`, undefined, query, options),
      get: (streamId: string, destinationId: string, options?: RequestOptions): Promise<StreamDestination> => this.#data('GET', `streams/${resourceId(streamId)}/destinations/${resourceId(destinationId)}`, undefined, undefined, options),
      update: (streamId: string, destinationId: string, input: UpdateDestinationInput, options?: RequestOptions): Promise<StreamDestination> => this.#streamCommand('PATCH', `streams/${resourceId(streamId)}/destinations/${resourceId(destinationId)}`, input, options),
      delete: (streamId: string, destinationId: string, options?: RequestOptions): Promise<{ id: string; deleted: true }> => this.#streamCommand('DELETE', `streams/${resourceId(streamId)}/destinations/${resourceId(destinationId)}`, undefined, options),
      rotateSecret: (streamId: string, destinationId: string, input: RotateDestinationSecretInput, options?: RequestOptions): Promise<StreamDestination> => this.#streamCommand('POST', `streams/${resourceId(streamId)}/destinations/${resourceId(destinationId)}/rotate-secret`, input, options),
    },
    create: (input: CreateStreamInput, options?: RequestOptions): Promise<StreamResource> =>
      this.#streamCommand('POST', 'streams', input, options),
    list: (query: StreamListQuery = {}, options?: RequestOptions): Promise<StreamPage> =>
      this.#data('GET', 'streams', undefined, query, options),
    get: (streamId: string, options?: RequestOptions): Promise<StreamDetail> =>
      this.#data('GET', `streams/${resourceId(streamId)}`, undefined, undefined, options),
    update: (streamId: string, input: UpdateStreamInput, options?: RequestOptions): Promise<StreamResource> =>
      this.#data('PATCH', `streams/${resourceId(streamId)}`, input, undefined, options),
    delete: (streamId: string, options?: RequestOptions): Promise<StreamingOperation> =>
      this.#streamCommand('DELETE', `streams/${resourceId(streamId)}`, undefined, options),
    start: (streamId: string, options?: RequestOptions): Promise<StreamingOperation> =>
      this.#streamCommand('POST', `streams/${resourceId(streamId)}/source-sessions`, {}, options),
    stop: (streamId: string, options?: RequestOptions): Promise<StreamingOperation> =>
      this.#streamCommand('POST', `streams/${resourceId(streamId)}/stop`, {}, options),
    listIngestCredentials: (streamId: string, options?: RequestOptions): Promise<IngestCredentialList> =>
      this.#data('GET', `streams/${resourceId(streamId)}/ingest-credentials`, undefined, undefined, options),
    createIngestCredentials: (streamId: string, input: CreateIngestCredentialInput = {}, options?: RequestOptions): Promise<IngestCredential> =>
      this.#streamCommand('POST', `streams/${resourceId(streamId)}/ingest-credentials`, input, options),
    rotateIngestCredentials: (streamId: string, credentialId: string, input: CreateIngestCredentialInput = {}, options?: RequestOptions): Promise<RotatedIngestCredential> =>
      this.#streamCommand('POST', `streams/${resourceId(streamId)}/ingest-credentials/${resourceId(credentialId)}/rotate`, input, options),
    getPlayback: (streamId: string, options?: RequestOptions): Promise<StreamPlayback> =>
      this.#data('GET', `streams/${resourceId(streamId)}/playback`, undefined, undefined, options),
    createPlaybackGrant: (streamId: string, input: CreatePlaybackGrantInput = {}, options?: RequestOptions): Promise<PlaybackGrant> =>
      this.#data('POST', `streams/${resourceId(streamId)}/playback-grants`, input, undefined, options),
    revokePlaybackGrants: (streamId: string, options?: RequestOptions): Promise<{ revoked: true }> =>
      this.#data('POST', `streams/${resourceId(streamId)}/playback-grants/revoke`, {}, undefined, options),
    getUsage: (streamId: string, options?: RequestOptions): Promise<StreamingUsage> =>
      this.#data('GET', `streams/${resourceId(streamId)}/usage`, undefined, undefined, options),
  }


  readonly restreamSources = {
    create: (input:CreateRestreamSourceInput,options?:RequestOptions):Promise<RestreamSource> => this.#streamCommand('POST','restream-sources',input,options),
    list: (query:{cursor?:string;limit?:number} = {},options?:RequestOptions):Promise<{data:RestreamSource[];nextCursor:string|null}> => this.#data('GET','restream-sources',undefined,query,options),
    get: (sourceId:string,options?:RequestOptions):Promise<RestreamDetail> => this.#data('GET',`restream-sources/${resourceId(sourceId)}`,undefined,undefined,options),
    update: (sourceId:string,input:UpdateRestreamSourceInput,options?:RequestOptions):Promise<RestreamSource> => this.#streamCommand('PATCH',`restream-sources/${resourceId(sourceId)}`,input,options),
    delete: (sourceId:string,options?:RequestOptions):Promise<{id:string;deleted:true}> => this.#streamCommand('DELETE',`restream-sources/${resourceId(sourceId)}`,undefined,options),
    probe: (sourceId:string,options?:RequestOptions):Promise<RestreamDetail> => this.#streamCommand('POST',`restream-sources/${resourceId(sourceId)}/probe`,{},options),
    start: (sourceId:string,options?:RequestOptions):Promise<RestreamDetail> => this.#streamCommand('POST',`restream-sources/${resourceId(sourceId)}/start`,{},options),
    stop: (sourceId:string,options?:RequestOptions):Promise<RestreamDetail> => this.#streamCommand('POST',`restream-sources/${resourceId(sourceId)}/stop`,{},options),
  }

  readonly schedules = {
    create: (input:CreateScheduleInput,options?:RequestOptions):Promise<ScheduledBroadcast> => this.#streamCommand('POST','scheduled-broadcasts',input,options),
    list: (query:{cursor?:string;limit?:number;state?:ScheduledBroadcast['state']} = {},options?:RequestOptions):Promise<SchedulePage> => this.#data('GET','scheduled-broadcasts',undefined,query,options),
    get: (scheduleId:string,options?:RequestOptions):Promise<ScheduledBroadcast> => this.#data('GET',`scheduled-broadcasts/${resourceId(scheduleId)}`,undefined,undefined,options),
    update: (scheduleId:string,input:UpdateScheduleInput,options?:RequestOptions):Promise<ScheduledBroadcast> => this.#streamCommand('PATCH',`scheduled-broadcasts/${resourceId(scheduleId)}`,input,options),
    cancel: (scheduleId:string,input:{version:number},options?:RequestOptions):Promise<ScheduledBroadcast> => this.#streamCommand('POST',`scheduled-broadcasts/${resourceId(scheduleId)}/cancel`,input,options),
    startNow: (scheduleId:string,input:{version:number},options?:RequestOptions):Promise<ScheduledBroadcast> => this.#streamCommand('POST',`scheduled-broadcasts/${resourceId(scheduleId)}/start-now`,input,options),
    getOperation: (operationId:string,options?:RequestOptions):Promise<ScheduleOperation> => this.#data('GET',`schedule-operations/${resourceId(operationId)}`,undefined,undefined,options),
    getPlayback: (scheduleId:string,options?:RequestOptions):Promise<ScheduledPlayback> => this.#data('GET',`scheduled-broadcasts/${resourceId(scheduleId)}/playback`,undefined,undefined,options),
    createPlaybackGrant: (scheduleId:string,input:{ttlSeconds?:number}={},options?:RequestOptions):Promise<PlaybackGrant> => this.#streamCommand('POST',`scheduled-broadcasts/${resourceId(scheduleId)}/playback-grants`,input,options),
    createIngestCredentials: (scheduleId:string,options?:RequestOptions):Promise<IngestCredential & {scheduleId:string;notBefore:string}> => this.#streamCommand('POST',`scheduled-broadcasts/${resourceId(scheduleId)}/ingest-credentials`,{},options),
  }

  readonly recordings = {
    list: (query: {cursor?:string;limit?:number} = {}, options?:RequestOptions):Promise<RecordingPage> => this.#data('GET', 'recordings', undefined, query, options),
    get: (recordingId:string,options?:RequestOptions):Promise<RecordingResource> => this.#data('GET', `recordings/${resourceId(recordingId)}`, undefined, undefined, options),
    stop: (recordingId:string,options?:RequestOptions):Promise<RecordingResource> => this.#streamCommand('POST', `recordings/${resourceId(recordingId)}/stop`, {}, options),
    getPlayback: (recordingId:string,options?:RequestOptions):Promise<RecordingPlayback> => this.#data('GET', `recordings/${resourceId(recordingId)}/playback`, undefined, undefined, options),
    delete: (recordingId:string,options?:RequestOptions):Promise<RecordingResource> => this.#streamCommand('DELETE', `recordings/${resourceId(recordingId)}`, undefined, options),
  }
  readonly assets = {
    get: (assetId:string,options?:RequestOptions):Promise<MediaAsset> => this.#data('GET', `assets/${resourceId(assetId)}`, undefined, undefined, options),
    createAccessGrant: (assetId:string,input:{action?:'playback'|'download';ttlSeconds?:number;audience?:'preview'|'viewer'} = {},options?:RequestOptions):Promise<AssetAccessGrant> => this.#streamCommand('POST', `assets/${resourceId(assetId)}/access-grants`, input, options),
    delete: (assetId:string,options?:RequestOptions):Promise<RecordingResource> => this.#streamCommand('DELETE', `assets/${resourceId(assetId)}`, undefined, options),
  }

  readonly mixers = {
    get: (mixerId:string,options?:RequestOptions):Promise<MixerResource> => this.#data('GET',`mixers/${resourceId(mixerId)}`,undefined,undefined,options),
    listScenes: (mixerId:string,options?:RequestOptions):Promise<{data:MixerSceneResource[]}> => this.#data('GET',`mixers/${resourceId(mixerId)}/scenes`,undefined,undefined,options),
    putScene: (mixerId:string,sceneId:string,input:PutMixerSceneInput,options?:RequestOptions):Promise<MixerSceneResource> => this.#streamCommand('PUT',`mixers/${resourceId(mixerId)}/scenes/${resourceId(sceneId)}`,input,options),
    activateScene: (mixerId:string,input:ActivateMixerSceneInput,options?:RequestOptions):Promise<MixerCommandResult> => this.#streamCommand('POST',`mixers/${resourceId(mixerId)}/activate-scene`,input,options),
    addOverlay: (mixerId:string,input:CreateMixerOverlayInput,options?:RequestOptions):Promise<MixerOverlay> => this.#streamCommand('POST',`mixers/${resourceId(mixerId)}/overlays`,input,options),
    removeOverlay: (mixerId:string,overlayId:string,options?:RequestOptions):Promise<{id:string;deleted:true}> => this.#streamCommand('DELETE',`mixers/${resourceId(mixerId)}/overlays/${resourceId(overlayId)}`,undefined,options),
    stop: (mixerId:string,input:{version:number},options?:RequestOptions):Promise<MixerCommandResult> => this.#streamCommand('POST',`mixers/${resourceId(mixerId)}/stop`,input,options),
    getOperation: (operationId:string,options?:RequestOptions):Promise<MixerOperation> => this.#data('GET',`mixer-operations/${resourceId(operationId)}`,undefined,undefined,options),
  }
  readonly broadcasts = {
    mixers: {
      create: (broadcastId:string,input:CreateMixerInput={},options?:RequestOptions):Promise<MixerResource> => this.#streamCommand('POST',`broadcasts/${resourceId(broadcastId)}/mixers`,input,options),
      list: (broadcastId:string,options?:RequestOptions):Promise<{data:MixerResource[]}> => this.#data('GET',`broadcasts/${resourceId(broadcastId)}/mixers`,undefined,undefined,options),
    },
    outputs: {
      retry: (broadcastId: string, outputId: string, input: BroadcastCommandInput = {}, options?: RequestOptions): Promise<StreamingOperation> => this.#streamCommand('POST', `broadcasts/${resourceId(broadcastId)}/outputs/${resourceId(outputId)}/retry`, input, options),
    },
    create: (input: CreateBroadcastInput, options?: RequestOptions): Promise<BroadcastResource> =>
      this.#streamCommand('POST', 'broadcasts', input, options),
    list: (query: ListBroadcastsQuery = {}, options?: RequestOptions): Promise<BroadcastPage> =>
      this.#data('GET', 'broadcasts', undefined, query, options),
    get: (broadcastId: string, options?: RequestOptions): Promise<BroadcastDetail> =>
      this.#data('GET', `broadcasts/${resourceId(broadcastId)}`, undefined, undefined, options),
    start: (broadcastId: string, input: BroadcastCommandInput = {}, options?: RequestOptions): Promise<StreamingOperation> =>
      this.#streamCommand('POST', `broadcasts/${resourceId(broadcastId)}/start`, input, options),
    stop: (broadcastId: string, input: BroadcastCommandInput = {}, options?: RequestOptions): Promise<StreamingOperation> =>
      this.#streamCommand('POST', `broadcasts/${resourceId(broadcastId)}/stop`, input, options),
    getOutputs: (broadcastId: string, options?: RequestOptions): Promise<{ data: BroadcastOutput[] }> =>
      this.#data('GET', `broadcasts/${resourceId(broadcastId)}/outputs`, undefined, undefined, options),
  }

  readonly streamingOperations = {
    get: (operationId: string, options?: RequestOptions): Promise<StreamingOperation> =>
      this.#data('GET', `streaming-operations/${resourceId(operationId)}`, undefined, undefined, options),
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
    renew: async (roomId: string, input: RenewParticipantTokenInput, options?: RequestOptions): Promise<ParticipantToken> =>
      this.#data('POST', `rooms/${resourceId(roomId)}/tokens/renew`, input, undefined, options),
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
      if ((input.roomId === undefined) !== (input.sessionId === undefined) || (input.participantId !== undefined && input.sessionId === undefined)) {
        throw new RelayApiError('INVALID_REQUEST', 'Provide roomId and sessionId together')
      }
      return this.#data('POST', 'turn/credentials', input, undefined, options)
    },
  }

  readonly usage = {
    get: async (query: UsageQuery = {}, options?: RequestOptions): Promise<UsageResponse> => {
      const { category = 'all', ...parameters } = query
      if (!['all', 'rooms', 'participants', 'sfu', 'turn', 'signaling', 'screen-share', 'streaming'].includes(category)) {
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

  #streamCommand<T>(method: HttpMethod, path: string, body: object | undefined, options?: RequestOptions): Promise<T> {
    return this.#data(method, path, body, undefined, { ...options, idempotencyKey: options?.idempotencyKey ?? randomUUID() })
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

function guestPath(streamId:string,broadcastId:string,route:string){return `streams/${resourceId(streamId)}/${route}?broadcastId=${resourceId(broadcastId)}`}
