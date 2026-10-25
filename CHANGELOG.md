# Changelog

## Unreleased

- Add `tokens.renew(roomId, input)` and `RenewParticipantTokenInput` for identity-preserving renewal of active room participants. Requires the matching API renewal endpoint; streaming guests retain their join-grant flow.

- Add Phase 0 stream management, ingest credentials, source start/stop, private playback grants, source usage and durable operation polling.
- Export typed streaming contracts and stream webhook event names.
- Support explicit Idempotency-Key request options; streaming commands generate a UUID when omitted. Existing mutation retry behavior is preserved.
- Requires matching unreleased core Phase 0 API; no package was published.
