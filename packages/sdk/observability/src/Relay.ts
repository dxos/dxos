//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, reached at `@dxos/observability/Relay`: a worker producing or replaying
// envelopes needs nothing else from the extensions barrel, and that barrel carries the OTel and
// PostHog extensions with it.

export * from './extensions/relay';
