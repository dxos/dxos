//
// Copyright 2022 DXOS.org
//

import { TestBuilder } from '@dxos/feed-store/testing';
import type { FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';

import { valueEncoding } from '../common';

/**
 * Builder with default encoder and generator.
 */
export class TestFeedBuilder extends TestBuilder<FeedMessage> {
  constructor() {
    super({
      valueEncoding,
    });
  }
}
