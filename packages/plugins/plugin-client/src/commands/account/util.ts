//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Options from 'effect/unstable/cli/Flag';

import * as Account from '@dxos/app-toolkit/Account';
import { ClientService } from '@dxos/client';

/** Client for the configured hub-service (accounts, invitations, email verification). */
export const hubClient = Effect.gen(function* () {
  const client = yield* ClientService;
  return Account.createHubClient(client);
});

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
): Options.Flag<T> =>
  Options.choiceWithValue('method', [
    ...methods.map((method): [string, T] => [method, method]),
    ...Object.entries(aliases),
  ]);
