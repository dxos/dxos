//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Context } from '@dxos/context';
import { EffectEx, Hook, RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';

import * as IdentityContract from '../../contracts/identity.ts';
import * as Events from '../../Events.ts';
import { type Identity } from '../../Identity.ts';
import { type CreateIdentityOptions, type JoinIdentityProps } from './identity-manager.ts';
import { EdgeIdentityRecoveryManagerService } from './identity-recovery-manager.ts';

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

export const IdentityLifecycleLayer: Layer.Layer<
  IdentityContract.LifecycleService,
  never,
  Hook.Controller | IdentityContract.ManagerService | EdgeIdentityRecoveryManagerService
> = Layer.effect(
  IdentityContract.LifecycleService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    const recoveryManager = yield* EdgeIdentityRecoveryManagerService;
    const runtime = yield* RuntimeProvider.currentRuntime<Hook.Controller>();
    const ctx = yield* EffectEx.contextFromScope();

    const lifecycle = createIdentityLifecycle({ identityManager, ctx, runtime });
    recoveryManager.setAcceptRecoveredIdentity((params) => lifecycle.acceptIdentity(params));

    // The persisted identity joins once networking is up; a missing identity leaves the stack
    // dormant until one is created or accepted.
    yield* Hook.on(
      Events.NetworkReady,
      Effect.fn('IdentityLifecycle.onNetworkReady')(function* () {
        const identity = identityManager.identity;
        if (!identity) {
          log('no identity, skipping network join');
          return;
        }
        log('joining network...');
        yield* Effect.promise(() => identity.joinNetwork(ctx));
        yield* Hook.emit(Events.IdentityAvailable, { identity });
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
  identityManager: IdentityContract.Manager;
  ctx: Context;
  runtime: RuntimeProvider.RuntimeProvider<Hook.Controller>;
}): IdentityLifecycle => {
  const emit = RuntimeProvider.runPromise(runtime);

  return {
    createIdentity: async (params = {}, ctx = defaultCtx) => {
      const identity = await identityManager.createIdentity(params, ctx);
      await emit(Hook.emit(Events.IdentityBound, { identity }));
      await identity.joinNetwork(ctx);
      await emit(Hook.emit(Events.IdentityAvailable, { identity }));
      log('identity created', { identityKey: identity.identityKey });
      return identity;
    },

    acceptIdentity: async (params) => {
      const ctx = defaultCtx;
      const { identity, identityRecord } = await identityManager.prepareIdentity(params, ctx);
      try {
        await emit(Hook.emit(Events.IdentityBound, { identity, deviceCredential: params.authorizedDeviceCredential }));
        await identity.joinNetwork(ctx);
      } catch (err) {
        // Nothing owns the prepared identity until the manager accepts it.
        await identity.close(ctx).catch((closeErr) => log.catch(closeErr));
        throw err;
      }
      await identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
      await emit(Hook.emit(Events.IdentityAvailable, { identity }));
      log('identity accepted', { identityKey: identity.identityKey });
      return identity;
    },
  };
};
