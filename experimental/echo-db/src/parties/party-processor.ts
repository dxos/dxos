//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import {
  FeedKey, FeedSelector, FeedBlock, FeedKeyMapper, IHaloStream, PartyKey, Spacetime, MessageSelector
} from '@dxos/experimental-echo-protocol';
import { jsonReplacer } from '@dxos/experimental-util';

const log = debug('dxos:echo:party-processor');

const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

/**
 * Manages current party state (e.g., admitted feeds).
 * This is a base class that is extended by `HALO`, which manages access control.
 */
export abstract class PartyProcessor {
  protected readonly _partyKey: PartyKey;

  // Active set of admitted feeds.
  protected readonly _feedKeys = new Set<FeedKey>();

  // Current timeframe.
  private _timeframe = spacetime.createTimeframe();

  /**
   * @param partyKey
   * @param feedKey - Genesis feed for node.
   */
  constructor (partyKey: PartyKey, feedKey: FeedKey) {
    assert(partyKey);
    assert(feedKey);
    this._partyKey = partyKey;
    this._feedKeys.add(feedKey);
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

  updateTimeframe (key: FeedKey, seq: number) {
    this._timeframe = spacetime.merge(this._timeframe, spacetime.createTimeframe([[key as any, seq]]));
  }

  async processMessage (message: IHaloStream): Promise<void> {
    log(`Processing: ${JSON.stringify(message, jsonReplacer)}`);
    return this._processMessage(message);
  }

  abstract async _processMessage (message: IHaloStream): Promise<void>;
}
