//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';

import * as Sandbox from '../types/Sandbox';

/**
 * Resolves sandbox credential refs into env var names and token values for exec calls.
 */
export const resolveSandboxCredentialEnv = (
  credentials: Sandbox.Sandbox['credentials'],
): Effect.Effect<Record<string, string>, never, Database.Service> =>
  Effect.gen(function* () {
    if (!credentials?.length) {
      return {};
    }

    const env: Record<string, string> = {};
    for (const { env: envName, token: tokenRef } of credentials) {
      const accessToken = yield* Database.load(tokenRef);
      if (accessToken.token) {
        env[envName] = accessToken.token;
      }
    }
    return env;
  });

/**
 * Merges sandbox credential env with optional exec overrides (overrides win on conflict).
 */
export const mergeExecEnv = (
  credentials: Sandbox.Sandbox['credentials'],
  overrides?: Record<string, string>,
): Effect.Effect<Record<string, string> | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const credentialEnv = yield* resolveSandboxCredentialEnv(credentials);
    if (!overrides && Object.keys(credentialEnv).length === 0) {
      return undefined;
    }
    return { ...credentialEnv, ...overrides };
  });
