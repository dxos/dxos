//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { FeedStore } from '@dxos/feed-store';

import { ModelFactory } from './models';
import { Party, PartyFilter, PartyKey, PartyManager } from './parties';
import { ResultSet } from './result';

export interface Options {
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
}

/**
 * Root object for the ECHO databse.
 */
export class Database {
  private readonly _partyUpdate = new Event<Party>();
  private readonly _partyManager: PartyManager;

  /**
   * @param feedStore
   * @param modelFactory
   * @param options
   */
  // TODO(burdon): Pass in PartyManager?
  constructor (feedStore: FeedStore, modelFactory: ModelFactory, options?: Options) {
    assert(feedStore);
    assert(modelFactory);
    this._partyManager = new PartyManager(feedStore, modelFactory, options);
  }

  // TODO(burdon): Chain events from PartyManager.
  async open () {
    await this._partyManager.open();
  }

  async close () {
    await this._partyManager.close();
  }

  /**
   * Creates a new party.
   */
  async createParty (): Promise<Party> {
    await this.open();

    const party = await this._partyManager.createParty();
    await party.open();

    // Notify update event.
    setImmediate(() => this._partyUpdate.emit(party));

    return party;
  }

  /**
   * @param partyKey
   */
  async getParty (partyKey: PartyKey): Promise<Party | undefined> {
    await this.open();

    return this._partyManager.parties.find(party => Buffer.compare(party.key, partyKey) === 0);
  }

  /**
   * @param filter
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async queryParties (filter?: PartyFilter): Promise<ResultSet<Party>> {
    await this.open();

    return new ResultSet<Party>(this._partyUpdate, () => this._partyManager.parties);
  }
}
