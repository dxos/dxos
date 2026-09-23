//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Context, type Lifecycle, Resource } from '@dxos/context';
import { type CredentialProcessor, getCredentialAssertion } from '@dxos/credentials';
import { EffectEx, Hook } from '@dxos/effect';
import { assertState } from '@dxos/invariant';
import { log } from '@dxos/log';
import { requirePublicKey } from '@dxos/protocols/buf';
import { type Credential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import * as SpacesContract from '../../contracts/spaces.ts';
import * as Events from '../../Events.ts';
import { type Identity } from '../../Identity.ts';

/**
 * Replicates cross-device space membership and deletion credentials from the halo space.
 */
export interface CrossDeviceSpaceSynchronizer extends CredentialProcessor, Lifecycle {
  setIdentity(identity: Identity): void;
}

/**
 * Effect service tag for {@link CrossDeviceSpaceSynchronizer}.
 */
export class CrossDeviceSpaceSynchronizerService extends EffectContext.Service<
  CrossDeviceSpaceSynchronizerService,
  CrossDeviceSpaceSynchronizer
>()('@dxos/client-services/CrossDeviceSpaceSynchronizer') {}

class CrossDeviceSpaceSynchronizerImpl extends Resource implements CrossDeviceSpaceSynchronizer {
  private _identity?: Identity;

  constructor(private readonly dataSpaceManager: SpacesContract.Manager) {
    super();
  }

  setIdentity(identity: Identity): void {
    this._identity = identity;
  }

  protected override async _open(ctx: Context): Promise<void> {
    assertState(this._identity, 'identity not set');
    await this._identity.space.spaceState.addCredentialProcessor(this);
  }

  protected override async _close(ctx: Context): Promise<void> {
    if (!this._identity) {
      return;
    }
    await this._identity.space.spaceState.removeCredentialProcessor(this);
  }

  async processCredential(credential: Credential): Promise<void> {
    assertState(this._identity, 'identity not set');
    const assertion = getCredentialAssertion(credential);

    // A space was tombstoned on another device: replicate the deletion locally.
    if (assertion.$typeName === 'dxos.halo.credentials.SpaceDeleted') {
      const spaceKey = requirePublicKey(assertion.spaceKey);
      if (spaceKey.equals(this._identity.space.key)) {
        // ignore halo space
        return;
      }
      if (!this.dataSpaceManager) {
        log('dataSpaceManager not initialized yet, ignoring space deletion', { details: assertion });
        return;
      }

      try {
        log('tombstoning space recorded in halo', { details: assertion });
        await this.dataSpaceManager.handleRemoteSpaceDeleted(this._ctx, spaceKey);
      } catch (err) {
        log.catch(err);
      }
      return;
    }

    if (assertion.$typeName !== 'dxos.halo.credentials.SpaceMember') {
      return;
    }
    const spaceKey = requirePublicKey(assertion.spaceKey);
    if (spaceKey.equals(this._identity.space.key)) {
      // ignore halo space
      return;
    }
    if (!this.dataSpaceManager) {
      log('dataSpaceManager not initialized yet, ignoring space admission', { details: assertion });
      return;
    }
    // Do not re-accept a space that has been tombstoned (handles out-of-order credential replay).
    if (this.dataSpaceManager.isSpaceDeleted(spaceKey)) {
      log('space is deleted, ignoring space admission', { details: assertion });
      return;
    }
    if (this.dataSpaceManager.spaces.has(spaceKey)) {
      log('space already exists, ignoring space admission', { details: assertion });
      return;
    }

    try {
      log('accepting space recorded in halo', { details: assertion });
      await this.dataSpaceManager.acceptSpace(this._ctx, {
        spaceKey,
        genesisFeedKey: requirePublicKey(assertion.genesisFeedKey),
        spaceRootUrl: assertion.spaceRootUrl,
        tags: assertion.tags,
      });
    } catch (err) {
      log.catch(err);
    }
  }
}

/**
 * Creates a dormant {@link CrossDeviceSpaceSynchronizer} bound to the given data space manager.
 */
export const createCrossDeviceSpaceSynchronizer = (
  dataSpaceManager: SpacesContract.Manager,
): CrossDeviceSpaceSynchronizer => new CrossDeviceSpaceSynchronizerImpl(dataSpaceManager);

/**
 * Effect Layer constructing a dormant {@link CrossDeviceSpaceSynchronizer}.
 */
export const CrossDeviceSpaceSynchronizerLayer: Layer.Layer<
  CrossDeviceSpaceSynchronizerService,
  never,
  Hook.Controller | SpacesContract.ManagerService
> = Layer.effect(
  CrossDeviceSpaceSynchronizerService,
  Effect.gen(function* () {
    const dataSpaceManager = yield* SpacesContract.ManagerService;
    const synchronizer = createCrossDeviceSpaceSynchronizer(dataSpaceManager);

    const ctx = yield* EffectEx.contextFromScope();
    yield* Effect.addFinalizer(() => Effect.promise(async () => synchronizer.close?.()));
    yield* Hook.on(
      Events.DataSpacesAvailable,
      Effect.fn('CrossDeviceSpaceSynchronizer.onDataSpacesAvailable')(function* ({ identity }) {
        synchronizer.setIdentity(identity);
        yield* Effect.promise(async () => synchronizer.open?.(ctx));
      }),
    );
    return synchronizer;
  }),
);
