//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { EffectEx } from '@dxos/effect';
import { type LoginRequest, type LoginResponse } from '@dxos/protocols';

import { signupWithEmail } from './flow';
import { HubApi, type HubApiService, type LocalIdentity, SignupIdentity, type SignupIdentityService } from './services';

const IDENTITY: LocalIdentity = { identityDid: 'did:key:zStub', identityKey: 'deadbeef', displayName: 'ada' };
const EMAIL = 'ada@example.com';

type Recorder = { logins: LoginRequest[]; agents: number; tokens: string[] };

/** `existing: null` means the profile has no local identity; omitted means it has {@link IDENTITY}. */
const makeStubs = (login: (body: LoginRequest) => LoginResponse, existing: LocalIdentity | null = IDENTITY) => {
  const recorder: Recorder = { logins: [], agents: 0, tokens: [] };

  const hub: HubApiService = {
    login: (body) =>
      Effect.sync(() => {
        recorder.logins.push(body);
        return login(body);
      }),
  };

  const identity: SignupIdentityService = {
    read: Effect.succeed(existing ?? undefined),
    ensure: () => Effect.succeed(IDENTITY),
    createAgent: Effect.sync(() => {
      recorder.agents += 1;
    }),
    redeemToken: (token) =>
      Effect.sync(() => {
        recorder.tokens.push(token);
      }),
  };

  return { recorder, layer: Layer.merge(Layer.succeed(HubApi, hub), Layer.succeed(SignupIdentity, identity)) };
};

describe('signupWithEmail', () => {
  test('creates an identity and retries with the DID when the server asks', ({ expect }) => {
    const { recorder, layer } = makeStubs((body) => (body.identityDid ? { admitted: true } : { needsIdentity: true }));
    return EffectEx.runPromise(
      signupWithEmail({ email: EMAIL, agent: true }).pipe(
        Effect.provide(layer),
        Effect.map((outcome) => {
          expect(outcome._tag).toBe('AccountCreated');
          expect(recorder.logins).toHaveLength(2);
          expect(recorder.logins[0].identityDid).toBeUndefined();
          expect(recorder.logins[1].identityDid).toBe(IDENTITY.identityDid);
          expect(recorder.logins[1].identityKey).toBe(IDENTITY.identityKey);
          expect(recorder.agents).toBe(1);
        }),
      ),
    );
  });

  test('skips the agent when --no-agent is passed', ({ expect }) => {
    const { recorder, layer } = makeStubs((body) => (body.identityDid ? { admitted: true } : { needsIdentity: true }));
    return EffectEx.runPromise(
      signupWithEmail({ email: EMAIL, agent: false }).pipe(
        Effect.provide(layer),
        Effect.map(() => expect(recorder.agents).toBe(0)),
      ),
    );
  });

  test('prefers admission over a token on the retry', ({ expect }) => {
    const { recorder, layer } = makeStubs((body) =>
      body.identityDid ? { admitted: true, token: 'tok_1' } : { needsIdentity: true },
    );
    return EffectEx.runPromise(
      signupWithEmail({ email: EMAIL, agent: true }).pipe(
        Effect.provide(layer),
        Effect.map((outcome) => {
          expect(outcome._tag).toBe('AccountCreated');
          expect(recorder.tokens).toHaveLength(0);
        }),
      ),
    );
  });

  test('redeems an inline token as a restore', ({ expect }) => {
    const { recorder, layer } = makeStubs(() => ({ token: 'tok_1' }));
    return EffectEx.runPromise(
      signupWithEmail({ email: EMAIL, agent: true }).pipe(
        Effect.provide(layer),
        Effect.map((outcome) => {
          expect(outcome._tag).toBe('IdentityRestored');
          expect(recorder.tokens).toEqual(['tok_1']);
          expect(recorder.logins).toHaveLength(1);
        }),
      ),
    );
  });

  test('reports EmailSent when the server returns nothing actionable', ({ expect }) => {
    const { recorder, layer } = makeStubs(() => ({}));
    return EffectEx.runPromise(
      signupWithEmail({ email: EMAIL, agent: true }).pipe(
        Effect.provide(layer),
        Effect.map((outcome) => {
          expect(outcome._tag).toBe('EmailSent');
          expect(recorder.logins).toHaveLength(1);
        }),
      ),
    );
  });

  test('fails when a redeemed token leaves no local identity', ({ expect }) => {
    const { layer } = makeStubs(() => ({ token: 'tok_1' }), null);
    return EffectEx.runPromise(
      signupWithEmail({ email: EMAIL, agent: true }).pipe(
        Effect.provide(layer),
        Effect.flip,
        Effect.map((error) => expect(error._tag).toBe('SignupFailedError')),
      ),
    );
  });
});
