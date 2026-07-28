//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Capabilities, Plugin } from '@dxos/app-framework';
import { ClientService, ConfigService } from '@dxos/client';
import { type NoHandlerError } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { HubHttpClient } from '@dxos/edge-client';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { type LoginRequest, type LoginResponse } from '@dxos/protocols';

import { ClientOperation } from '#operations';

/** Public hub, used when neither the flag nor either config key is set. */
export const DEFAULT_HUB_URL = 'https://hub.dxos.network';

export class HubApiError extends BaseError.extend('HubApiError', 'Hub API error') {}

/**
 * Two config keys name the hub today (`runtime.app.env.DX_HUB_URL` in Composer,
 * `runtime.services.hub.url` in the CLI's own hub commands), so read both.
 */
export const resolveHubUrl = (override: Option.Option<string>): Effect.Effect<string, never, ConfigService> =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    return Option.getOrElse(
      override,
      () =>
        config.values?.runtime?.app?.env?.DX_HUB_URL ?? config.values?.runtime?.services?.hub?.url ?? DEFAULT_HUB_URL,
    );
  });

export type HubApiService = {
  readonly login: (body: LoginRequest) => Effect.Effect<LoginResponse, HubApiError>;
};

export class HubApi extends Context.Tag('HubApi')<HubApi, HubApiService>() {
  static layer = (hubUrl: string): Layer.Layer<HubApi> => {
    const client = new HubHttpClient(hubUrl);
    return Layer.succeed(HubApi, {
      login: (body) =>
        Effect.tryPromise({
          try: () => client.login(DxContext.default(), body),
          // Name the hub: the most common failure is a deployment with no mail transport
          // configured, which answers 500 for regular addresses.
          catch: (cause) => new HubApiError({ message: `Login request to ${hubUrl} failed`, cause }),
        }),
    });
  };
}

export type LocalIdentity = {
  readonly identityDid: string;
  readonly identityKey: string;
  readonly displayName?: string;
};

export type SignupIdentityService = {
  readonly read: Effect.Effect<LocalIdentity | undefined>;
  readonly ensure: (displayNameSeed: string) => Effect.Effect<LocalIdentity, NoHandlerError>;
  readonly createAgent: Effect.Effect<void, NoHandlerError>;
  readonly redeemToken: (token: string) => Effect.Effect<void, NoHandlerError>;
};

export class SignupIdentity extends Context.Tag('SignupIdentity')<SignupIdentity, SignupIdentityService>() {
  static layer: Layer.Layer<SignupIdentity, never, ClientService | Plugin.Service> = Layer.effect(
    SignupIdentity,
    Effect.gen(function* () {
      const client = yield* ClientService;
      const manager = yield* Plugin.Service;
      const { invoke } = manager.capabilities.get(Capabilities.OperationInvoker);

      const read: Effect.Effect<LocalIdentity | undefined> = Effect.sync(() => {
        const identity = client.halo.identity.get();
        if (!identity) {
          return undefined;
        }
        return {
          identityDid: identity.did,
          identityKey: identity.identityKey.toHex(),
          ...(identity.profile?.displayName !== undefined && { displayName: identity.profile.displayName }),
        } satisfies LocalIdentity;
      });

      return {
        read,

        // The display name mirrors the gate's `email.split('@')[0]`; `CreateIdentity` fires
        // `IdentityCreated`, which is what makes SpacePlugin provision the personal space.
        ensure: (displayNameSeed) =>
          Effect.gen(function* () {
            const existing = yield* read;
            if (existing) {
              return existing;
            }
            yield* invoke(ClientOperation.CreateIdentity, { displayName: displayNameSeed.split('@')[0] });
            const created = yield* read;
            invariant(created, 'identity should exist after create');
            return created;
          }),

        createAgent: invoke(ClientOperation.CreateAgent).pipe(Effect.asVoid),

        redeemToken: (token) => invoke(ClientOperation.RedeemToken, { token }).pipe(Effect.asVoid),
      } satisfies SignupIdentityService;
    }),
  );
}
