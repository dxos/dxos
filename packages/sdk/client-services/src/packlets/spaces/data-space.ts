//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Context } from '@dxos/context';
import { Database, DataPipelineControllerImpl, ISpace, Space } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { ComplexSet } from '@dxos/util';

import { Presence } from '@dxos/teleport-extension-presence';
import { TrustedKeySetAuthVerifier } from '../identity';

const AUTH_TIMEOUT = 30000;

export class DataSpace implements ISpace {
  private readonly _ctx = new Context();
  private readonly _dataPipelineController: DataPipelineControllerImpl;
  public readonly authVerifier: TrustedKeySetAuthVerifier;

  constructor(
    private readonly _inner: Space,
    private readonly _modelFactory: ModelFactory,
    private readonly _memberKey: PublicKey,
    private readonly _presence: Presence
  ) {
    this._dataPipelineController = new DataPipelineControllerImpl(_modelFactory, _memberKey, (feedKey) =>
      _inner.spaceState.feeds.get(feedKey)
    );
    this.authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => new ComplexSet(PublicKey.hash, Array.from(_inner.spaceState.members.keys())),
      update: _inner.stateUpdate,
      authTimeout: AUTH_TIMEOUT
    });
  }

  get key() {
    return this._inner.key;
  }

  get inner() {
    return this._inner;
  }

  get isOpen() {
    return this._inner.isOpen;
  }

  get dataPipelineController(): DataPipelineControllerImpl {
    return this._dataPipelineController;
  }

  get database(): Database {
    assert(this._dataPipelineController.database);
    return this._dataPipelineController.database;
  }

  get stateUpdate() {
    return this._inner.stateUpdate;
  }

  get presence() {
    return this._presence;
  }

  async open() {
    await this._inner.open();
  }

  async close() {
    await this._ctx.dispose();
    await this.authVerifier.close();
    await this._inner.close();
    await this._presence.destroy();
  }
}
