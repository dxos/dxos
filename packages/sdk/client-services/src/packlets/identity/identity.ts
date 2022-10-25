//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import {
  DeviceStateMachine,
  CredentialSigner,
  createCredentialSignerWithKey,
  createCredentialSignerWithChain
} from '@dxos/credentials';
import { Signer } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { Database, Space } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ComplexSet } from '@dxos/util';

export type IdentityParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  signer: Signer;
  space: Space;
};

/**
 * Agent identity manager, which includes the agent's Halo space.
 */
// TODO(burdon): Rename Halo (i.e., something bigger?)
export class Identity {
  public readonly identityKey: PublicKey;
  public readonly deviceKey: PublicKey;

  private readonly _signer: Signer;
  private readonly _space: Space;
  private readonly _deviceStateMachine: DeviceStateMachine;

  constructor({ identityKey, deviceKey, signer, space }: IdentityParams) {
    this.identityKey = identityKey;
    this.deviceKey = deviceKey;

    this._signer = signer;
    this._space = space;
    this._deviceStateMachine = new DeviceStateMachine(this.identityKey, this.deviceKey);

    // TODO(burdon): Unbind on destroy? (Pattern).
    // Save device key chain credential when processed by the party state machine.
    this._space.onCredentialProcessed.set(async (credential) => {
      await this._deviceStateMachine.process(credential);
    });
  }

  // TODO(burdon): Expose state object?
  get authorizedDeviceKeys(): ComplexSet<PublicKey> {
    return this._deviceStateMachine.authorizedDeviceKeys;
  }

  async open() {
    await this._space.open();
  }

  async close() {
    await this._space.close();
  }

  async ready() {
    await this._deviceStateMachine.deviceChainReady.wait();

    // TODO(dmaretskyi): Should we also wait for our feeds to be admitted?
  }

  /**
   * @test-only
   */
  get controlPipeline() {
    return this._space.controlPipeline;
  }

  get haloSpaceKey() {
    return this._space.key;
  }

  get haloGenesisFeedKey() {
    return this._space.genesisFeedKey;
  }

  get haloDatabase(): Database {
    return this._space.database ?? failUndefined();
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner(): CredentialSigner {
    assert(this._deviceStateMachine.deviceCredentialChain, 'Device credential chain is not ready.');
    return createCredentialSignerWithChain(
      this._signer,
      this._deviceStateMachine.deviceCredentialChain,
      this.deviceKey
    );
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner(): CredentialSigner {
    return createCredentialSignerWithKey(this._signer, this.deviceKey);
  }
}
