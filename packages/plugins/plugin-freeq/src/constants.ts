//
// Copyright 2026 DXOS.org
//

/** `Channel.backend.kind` for a live freeq-backed channel. */
export const FREEQ_BACKEND_KIND = 'org.dxos.channel.backend.freeq';

/** `AccessToken.source` for a stored freeq session. */
export const FREEQ_SOURCE = 'freeq';

/** SASL mechanism advertised by freeq for AT Protocol auth. */
export const SASL_MECHANISM = 'ATPROTO-CHALLENGE';

/** Reconnect backoff bounds (ms). */
export const RECONNECT_MIN_DELAY = 1_000;
export const RECONNECT_MAX_DELAY = 30_000;

/** Interval (ms) after which a silent connection is pinged. */
export const KEEPALIVE_INTERVAL = 60_000;
