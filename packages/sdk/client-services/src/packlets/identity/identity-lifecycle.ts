//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Context } from '@dxos/context';
import { Event as EffectEvent, EffectEx, RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';

import { IdentityAvailable, IdentityBound, NetworkReady } from '../services/events.ts';
import {
  type CreateIdentityOptions,
  type IdentityManager,
  IdentityManagerService,
  type JoinIdentityProps,
} from './identity-manager.ts';
import { EdgeIdentityRecoveryManagerService } from './identity-recovery-manager.ts';
import { type Identity } from './identity.ts';

/**
 * Brings a new identity into the running stack: binds it to the network, joins, and announces it so
 * the identity-bound services open. The persisted identity on boot goes through the same events
 * from the host's open sequence.
 */
export interface IdentityLifecycle {
  /** Creates a fresh identity and resolves once its identity-bound services are open. */
  createIdentity(params?: CreateIdentityOptions, ctx?: Context): Promise<Identity>;
  /** Adopts an identity admitted by another device and resolves once its services are open. */
  acceptIdentity(params: JoinIdentityProps): Promise<Identity>;
}

export class IdentityLifecycleService extends EffectContext.Service<IdentityLifecycleService, IdentityLifecycle>()(
  '@dxos/client-services/IdentityLifecycle',
) {}

export const IdentityLifecycleLayer: Layer.Layer<
  IdentityLifecycleService,
  never,
  EffectEvent.Bus | IdentityManagerService | EdgeIdentityRecoveryManagerService
> = Layer.effect(
  IdentityLifecycleService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityManagerService;
    const recoveryManager = yield* EdgeIdentityRecoveryManagerService;
    const runtime = yield* RuntimeProvider.currentRuntime<EffectEvent.Bus>();
    const ctx = yield* EffectEx.contextFromScope();

    const lifecycle = createIdentityLifecycle({ identityManager, ctx, runtime });
    recoveryManager.setAcceptRecoveredIdentity((params) => lifecycle.acceptIdentity(params));

    // The persisted identity joins once networking is up; a missing identity leaves the stack
    // dormant until one is created or accepted.
    yield* EffectEvent.on(
      NetworkReady,
      Effect.fn('IdentityLifecycle.onNetworkReady')(function* () {
        const identity = identityManager.identity;
        if (!identity) {
          log('no identity, skipping network join');
          return;
        }
        log('joining network...');
        yield* Effect.promise(() => identity.joinNetwork(ctx));
        yield* EffectEvent.emit(IdentityAvailable, { identity });
      }),
    );
    return lifecycle;
  }),
);

const createIdentityLifecycle = ({
  identityManager,
  ctx: defaultCtx,
  runtime,
}: {
  identityManager: IdentityManager;
  ctx: Context;
  runtime: RuntimeProvider.RuntimeProvider<EffectEvent.Bus>;
}): IdentityLifecycle => {
  const emit = RuntimeProvider.runPromise(runtime);

  return {
    createIdentity: async (params = {}, ctx = defaultCtx) => {
      const identity = await identityManager.createIdentity(params, ctx);
      await emit(EffectEvent.emit(IdentityBound, { identity }));
      await identity.joinNetwork(ctx);
      await emit(EffectEvent.emit(IdentityAvailable, { identity }));
      log('identity created', { identityKey: identity.identityKey });
      return identity;
    },

    acceptIdentity: async (params) => {
      const ctx = defaultCtx;
      const { identity, identityRecord } = await identityManager.prepareIdentity(params, ctx);
      try {
        await emit(EffectEvent.emit(IdentityBound, { identity, deviceCredential: params.authorizedDeviceCredential }));
        await identity.joinNetwork(ctx);
      } catch (err) {
        // Nothing owns the prepared identity until the manager accepts it.
        await identity.close(ctx).catch((closeErr) => log.catch(closeErr));
        throw err;
      }
      await identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
      await emit(EffectEvent.emit(IdentityAvailable, { identity }));
      log('identity accepted', { identityKey: identity.identityKey });
      return identity;
    },
  };
};
