//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PartyKey } from '@dxos/echo-protocol';

import { InvitationDescriptor, SecretProvider } from './invitations';
import { PartyFilter, PartyManager, Party } from './parties';
import { ResultSet } from './result';

export interface Options {
  readOnly?: false;
  readLogger?: NodeJS.ReadWriteStream;
  writeLogger?: NodeJS.ReadWriteStream;
}

/**
 * This is the root object for the ECHO database.
 * It is used to query and mutate the state of all data accessible to the containing node.
 * Shared datasets are contained within `Parties` which consiste of immutable messages within multiple `Feeds`.
 * These feeds are replicated across peers in the network and stored in the `FeedStore`.
 * Parties contain queryable data `Items` which are reconstituted from an ordered stream of mutations by
 * different `Models`. The `Model` also handles `Item` mutations, which are streamed back to the `FeedStore`.
 * When opened, `Parties` construct a pair of inbound and outbound pipelines that connects each `Party` specific
 * `ItemManager` to the `FeedStore`.
 * Messages are streamed into the pipeline (from the `FeedStore`) in logical order, determined by the
 * `Spactime` `Timeframe` (which implements a vector clock).
 */
export class Database {
  constructor (
    private readonly _partyManager: PartyManager,
    private readonly _options: Options = {}
  ) {}

  toString () {
    return `Database(${JSON.stringify({
      parties: this._partyManager.parties.length,
      options: Object.keys(this._options).length ? this._options : undefined
    })})`;
  }

  get readOnly () {
    return this._options.readOnly;
  }

  /**
   * Opens the pary and constructs the inbound/outbound mutation streams.
   */
  async open () {
    await this._partyManager.open();
  }

  /**
   * Closes the party and associated streams.
   */
  async close () {
    await this._partyManager.close();
  }

  /**
   * Creates a new party.
   */
  async createParty (): Promise<Party> {
    if (this._options.readOnly) {
      throw new Error('Read-only.');
    }

    await this.open();

    const impl = await this._partyManager.createParty();
    await impl.open();

    return new Party(impl);
  }

  /**
   * Returns an individual party by it's key.
   * @param {PartyKey} partyKey
   */
  getParty (partyKey: PartyKey): Party | undefined {
    assert(this._partyManager.opened, 'Database not open.');

    const impl = this._partyManager.parties.find(party => Buffer.compare(party.key, partyKey) === 0);
    return impl && new Party(impl);
  }

  /**
   * Queries for a set of Parties matching the optional filter.
   * @param {PartyFilter} filter
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryParties (filter?: PartyFilter): ResultSet<Party> {
    assert(this._partyManager.opened, 'Database not open.');

    return new ResultSet(this._partyManager.update.discardParameter(), () => this._partyManager.parties.map(impl => new Party(impl)));
  }

  /**
   * Joins a party that was created by another peer and starts replicating with it.
   * @param invitationDescriptor
   * @param secretProvider
   */
  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider): Promise<Party> {
    assert(this._partyManager.opened, 'Database not open.');

    const impl = await this._partyManager.joinParty(invitationDescriptor, secretProvider);
    return new Party(impl);
  }
}
