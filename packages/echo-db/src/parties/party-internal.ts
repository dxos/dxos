//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { DatabaseSnapshot, PartyKey, PartySnapshot } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { timed } from '@dxos/util';

import { InvitationManager } from '../invitations/invitation-manager';
import { Item } from '../items';
import { Database } from '../items/database';
import { TimeframeClock } from '../items/timeframe-clock';
import { PartyProcessor } from './party-processor';
import { PartyProtocol } from './party-protocol';
import { Pipeline } from './pipeline';

// TODO(burdon): Format?
export const PARTY_ITEM_TYPE = 'wrn://dxos.org/item/party';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

export interface ActivationOptions {
  global?: boolean;
  device?: boolean;
}

export interface PartyActivator {
  isActive(): boolean,
  activate(options: ActivationOptions): Promise<void>;
  deactivate(options: ActivationOptions): Promise<void>;
}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class PartyInternal {
  private _database: Database | undefined;

  /**
   * Snapshot to be restored from when party.open() is called.
   */
  private _databaseSnapshot: DatabaseSnapshot | undefined;

  private _subscriptions: (() => void)[] = [];

  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _partyProcessor: PartyProcessor,
    private readonly _pipeline: Pipeline,
    private readonly _protocol: PartyProtocol,
    private readonly _timeframeClock: TimeframeClock,
    private readonly _invitationManager: InvitationManager,
    private readonly _activator: PartyActivator | undefined
  ) {
    assert(this._modelFactory);
    assert(this._partyProcessor);
    assert(this._pipeline);
  }

  get key (): PartyKey {
    return this._pipeline.partyKey;
  }

  get isOpen (): boolean {
    return !!this._database;
  }

  get database (): Database {
    assert(this._database, 'Party not open.');
    return this._database;
  }

  get processor () {
    return this._partyProcessor;
  }

  get pipeline () {
    return this._pipeline;
  }

  get invitationManager () {
    return this._invitationManager;
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  @synchronized
  @timed(5000)
  async open () {
    if (this.isOpen) {
      return this;
    }

    // TODO(burdon): Support read-only parties.
    const [readStream, writeStream] = await this._pipeline.open();

    this._database = new Database(
      this._modelFactory,
      this._timeframeClock,
      readStream,
      writeStream ?? null,
      this._databaseSnapshot
    );
    await this._database.init();

    if (this._pipeline.outboundHaloStream) {
      this._partyProcessor.setOutboundStream(this._pipeline.outboundHaloStream);
    }

    // Replication.
    await this._protocol.start();

    // TODO(burdon): Propagate errors.
    this._subscriptions.push(this._pipeline.errors.on(err => console.error(err)));

    return this;
  }

  /**
   * Closes the pipeline and streams.
   */
  @synchronized
  async close () {
    if (!this.isOpen) {
      return this;
    }

    await this._protocol.stop();

    // Disconnect the read stream.
    await this._database!.destroy();
    this._database = undefined;

    // TODO(burdon): Create test to ensure everything closes cleanly.
    await this._pipeline.close();

    this._subscriptions.forEach(cb => cb());

    return this;
  }

  get isActive () {
    assert(this._activator, 'PartyActivator required');
    return this._activator.isActive;
  }

  async activate (options: ActivationOptions) {
    assert(this._activator, 'PartyActivator required');
    await this._activator.activate(options);

    if (!this.isOpen) {
      await this.open();
    }
  }

  async deactivate (options: ActivationOptions) {
    assert(this._activator, 'PartyActivator required');
    await this._activator.deactivate(options);

    if (this.isOpen) {
      await this.close();
    }
  }

  /**
   * Returns a special Item that is used by the Party to manage its properties.
   */
  getPropertiestItem (): Item<ObjectModel> {
    const { value: items } = this.database.queryItems({ type: PARTY_ITEM_TYPE });
    assert(items.length === 1);
    return items[0];
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot (): PartySnapshot {
    return {
      partyKey: this.key,
      timeframe: this._timeframeClock.timeframe,
      timestamp: Date.now(),
      database: this.database.createSnapshot(),
      halo: this._partyProcessor.makeSnapshot()
    };
  }

  async restoreFromSnapshot (snapshot: PartySnapshot) {
    assert(snapshot.halo);
    assert(snapshot.database);

    await this.processor.restoreFromSnapshot(snapshot.halo);

    this._databaseSnapshot = snapshot.database;
  }
}
