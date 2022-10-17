//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { FeedWriter, MessageSelector } from '@dxos/feed-store';
import { Timeframe, TypedMessage } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

import { TimeframeClock } from './timeframe-clock';

const log = debug('dxos:echo-db:message-selector');

/**
 * The MessageSelector makes sure that we read in a trusted order.
 * The first message we wish to process is the PartyGenesis, which will admit a Feed.
 * As we encounter and process FeedAdmit messages those are added to the Party's trust,
 * and we begin processing messages from them as well.
 *
 * @param timeframeClock
 */
export const createMessageSelector = (timeframeClock: TimeframeClock): MessageSelector<FeedMessage> => candidates => {
  // Pick the first candidate with a valid timeframe that has no gaps.
  for (let i = 0; i < candidates.length; i++) {
    const { data: { timeframe } } = candidates[i];
    assert(timeframe);

    if (!timeframeClock.hasGaps(timeframe)) {
      return i;
    }
  }

  // Not ready for this message yet.
  log('Skipping...');
};

/**
 *
 * @param feed
 * @param getTimeframe
 */
const createFeedWriterWithTimeframe = (feed: FeedDescriptor, getTimeframe: () => Timeframe): FeedWriter<TypedMessage> => {
  const writer = createFeedWriter<FeedMessage>(feed);

  return mapFeedWriter(payload => ({
    payload,
    timeframe: getTimeframe()
  }), writer);
};
