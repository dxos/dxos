//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  FeedKey, FeedSelector, FeedBlock, FeedKeyMapper, IHaloStream, PartyKey, Spacetime, MessageSelector
} from '@dxos/experimental-echo-protocol';
import { jsonReplacer } from '@dxos/experimental-util';
import { Event } from '@dxos/async';

const log = debug('dxos:echo:party-processor');

const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

export interface FeedSetProvider {
  get(): FeedKey[]
  added: Event<FeedKey>
}

/**
 * Manages current party state (e.g., admitted feeds).
 * This is a base class that is extended by `HALO`, which manages access control.
 */
export abstract class PartyProcessor {
  protected readonly _partyKey: PartyKey;

  protected readonly _feedAdded = new Event<FeedKey>()

  // Active set of admitted feeds.
  private readonly _feedKeys = new Set<FeedKey>();

  // Current timeframe.
  private _timeframe = spacetime.createTimeframe();

  /**
   * @param partyKey
   * @param feedKey - Genesis feed for node.
   */
  constructor (partyKey: PartyKey, feeds: FeedKey[]) {
    assert(partyKey);
    this._partyKey = partyKey;
    for (const feed of feeds) {
      this._feedKeys.add(feed);
    }
  }

  get partyKey () {
    return this._partyKey;
  }

  get feedKeys () {
    return Array.from(this._feedKeys);
  }

  get timeframe () {
    return this._timeframe;
  }

  get feedSelector (): FeedSelector {
    return (feedKey: FeedKey) =>
      Array.from(this._feedKeys.values()).findIndex(k => Buffer.compare(k, feedKey) === 0) !== -1;
  }

  // TODO(burdon): Factor out from feed-store-iterator test.
  get messageSelector (): MessageSelector {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (candidates: FeedBlock[]) => 0;
  }

  protected _addFeedKey (key: FeedKey) {
    this._feedKeys.add(key);
    this._feedAdded.emit(key);
  }

  updateTimeframe (key: FeedKey, seq: number) {
    this._timeframe = spacetime.merge(this._timeframe, spacetime.createTimeframe([[key as any, seq]]));
  }

  async processMessage (message: IHaloStream): Promise<void> {
    log(`Processing: ${JSON.stringify(message, jsonReplacer)}`);
    return this._processMessage(message);
  }

  getActiveFeedSet (): FeedSetProvider {
    return {
      get: () => this.feedKeys,
      added: this._feedAdded
    };
  }

  abstract async _processMessage (message: IHaloStream): Promise<void>;

  // TODO(marik-d): This should probably be abstracted over some invitation mechanism
  async admitFeed (key: FeedKey) {
    this._addFeedKey(key);
  }
}
