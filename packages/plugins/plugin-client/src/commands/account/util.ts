//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { HubHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

/** Client for the configured hub-service (accounts, invitations, email verification). */
export const hubClient = Effect.gen(function* () {
  const client = yield* ClientService;
  const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
  invariant(hubUrl, 'Hub URL not configured (runtime.app.env.DX_HUB_URL).');
  return new HubHttpClient(hubUrl);
});

/**
 * Crockford base32 (no I/L/O/U), 8 characters, case-insensitive, hyphen optional. Mirrors the
 * gate's `validInvitationCode` so a malformed code fails before any request.
 */
export const validAccessCode = (code: string) =>
  /^[0-9A-HJ-KM-NP-TV-Z]{4}-?[0-9A-HJ-KM-NP-TV-Z]{4}$/i.test(code.trim());

/** Hub-service matches the canonical form only: no hyphen, upper case. */
export const normalizeAccessCode = (code: string) => code.trim().replace(/-/g, '').toUpperCase();
