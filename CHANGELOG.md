# Changelog

## 0.1.4

### Phase 3 - speakers, activity and push-to-talk

Add typed `rooms.getActivity`, `rooms.getActivityPolicy` and `rooms.updateActivityPolicy`. Node remains a management SDK and has no capture or push-to-talk API.

### Phase 2 - room admission and lifecycle

Add `rooms.getLifecycle`, `rooms.updateLifecycle` and `rooms.invitations.create/list/revoke/redeem`. Export typed lifecycle policies and invitations. Invitation creation disables automatic retries to preserve one-time secret handling.

### Phase 1 - room access

Add typed `participants.getAccess`, `participants.updateAccess` and `rooms.audit` methods and room access/audit contracts.

## 0.1.2

- Add participant-token renewal and streaming management for sources, runs, destinations, recordings, assets, schedules, clips, buffers, DVR, mixers and guests.
- Add safe ingest-credential history, credential handover state, service usage and recording/schedule event exports.
- Preserve rate-limit cooldown metadata and support explicit command idempotency.
