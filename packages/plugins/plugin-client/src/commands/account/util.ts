//
// Copyright 2026 DXOS.org
//

import * as Options from '@effect/cli/Options';
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

/** The atproto OAuth method, named for the account users connect with (as Composer labels it). */
export const ATMOSPHERE_METHOD = 'atmosphere' as const;

/** Prompt label for {@link ATMOSPHERE_METHOD}, matching Composer's `login-atmosphere.label`. */
export const ATMOSPHERE_METHOD_TITLE = 'Atmosphere account';

/** Handle or DID prompt shared by the Atmosphere login and sign-up paths. */
export const ATMOSPHERE_INPUT_PROMPT = 'Atmosphere handle or DID (e.g. alice.bsky.social)';

/** Accepted `--method` alias, so invocations predating the `atproto` -> `atmosphere` rename work. */
export const METHOD_ALIASES = { atproto: ATMOSPHERE_METHOD } as const;

/**
 * `--method` option for the account commands: each canonical name maps to itself, plus the aliases
 * above, which resolve to their canonical name rather than appearing as methods of their own.
 */
export const methodOption = <T extends string>(
  methods: readonly T[],
  aliases: Readonly<Record<string, T>>,
): Options.Options<T> =>
  Options.choiceWithValue('method', [
    ...methods.map((method): [string, T] => [method, method]),
    ...Object.entries(aliases),
  ]);
