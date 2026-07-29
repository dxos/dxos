//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { SubscribeToFeedsRequest, SubscribeToSpacesRequest } from './DevtoolsHost.ts';

describe('DevtoolsHost schemas', () => {
  // The devtools Storage panel subscribes to all feeds via `subscribeToFeeds({})`, so feedKeys must be optional.
  test('SubscribeToFeedsRequest decodes an empty payload', () => {
    const request = Schema.decodeUnknownSync(SubscribeToFeedsRequest)({});
    expect(request.feedKeys).to.be.undefined;
  });

  // `useSpacesInfo` subscribes to all spaces via `subscribeToSpaces({})`, so spaceKeys must be optional.
  test('SubscribeToSpacesRequest decodes an empty payload', () => {
    const request = Schema.decodeUnknownSync(SubscribeToSpacesRequest)({});
    expect(request.spaceKeys).to.be.undefined;
  });
});
