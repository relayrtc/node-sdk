# Changelog

## Unreleased

- Add Phase 0 stream management, ingest credentials, source start/stop, private playback grants, source usage and durable operation polling.
- Export typed streaming contracts and stream webhook event names.
- Support explicit Idempotency-Key request options; streaming commands generate a UUID when omitted. Existing mutation retry behavior is preserved.
- Requires matching unreleased core Phase 0 API; no package was published.
