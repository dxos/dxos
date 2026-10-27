//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { type EdgeHttpClient } from '@dxos/edge-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';
import { OAuthProvider } from '@dxos/protocols';

import { beginOAuthFlow } from './oauth.ts';

/**
 * An EDGE that predates `kind` reads every request as a user grant, so only an app connection may
 * send it: a user connector's initiate body is unchanged.
 */
describe('beginOAuthFlow', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { open: () => ({}) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const initiate = async (kind: 'user' | 'app') => {
    const requests: unknown[] = [];
    const edge = {
      baseUrl: 'https://edge.test',
      initiateOAuthFlow: async (_ctx: unknown, request: unknown) => {
        requests.push(request);
        return { authUrl: 'https://provider.test/authorize' };
      },
    } as unknown as EdgeHttpClient;
    await EffectEx.runPromise(
      beginOAuthFlow(
        edge,
        SpaceId.random(),
        { kind, oauth: { provider: OAuthProvider.GITHUB, scopes: ['repo'] } },
        'token-id',
        undefined,
      ),
    );
    return requests[0] as Record<string, unknown>;
  };

  test('a user connection sends no kind', async () => {
    expect(await initiate('user')).not.toHaveProperty('kind');
  });

  test('an app connection asks for an app grant', async () => {
    expect(await initiate('app')).toMatchObject({ kind: 'app' });
  });
});
