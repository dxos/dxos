//
// Copyright 2020 DXOS.org
//

import { type FeedBlock, type FeedBlockSelector } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

import { type TimeframeClock } from './timeframe-clock';

/**
 * The MessageSelector makes sure that we read in a trusted order.
 * The first message we wish to process is the SpaceGenesis, which will admit a Feed.
 * As we encounter and process FeedAdmit messages those are added to the Space's trust,
 * and we begin processing messages from them as well.
 */
export const createMessageSelector =
  (timeframeClock: TimeframeClock): FeedBlockSelector<FeedMessage> =>
  (messages: FeedBlock<FeedMessage>[]) => {
    // Pick the first candidate with a valid timeframe that has no gaps.
    for (let i = 0; i < messages.length; i++) {
      const {
        data: { timeframe },
      } = messages[i];
      invariant(timeframe);

      if (!timeframeClock.hasGaps(timeframe)) {
        return i;
      }
    }

    // Not ready for this message yet.
    log('Skipping...');
  };
