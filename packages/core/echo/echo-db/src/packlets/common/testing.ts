//
// Copyright 2022 DXOS.org
//

import { TestBuilder } from '@dxos/feed-store';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

import { valueEncoding } from './codec';

/**
 * Builder with default encoder and generator.
 */
export class TestFeedBuilder extends TestBuilder<FeedMessage> {
  constructor() {
    super({
      valueEncoding
    });
  }
}
