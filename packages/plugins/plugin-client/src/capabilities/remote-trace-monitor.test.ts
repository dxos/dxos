//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { NetworkService } from '@dxos/protocols/rpc';

import { createSubscribeRequest } from './remote-trace-monitor.ts';

describe('createSubscribeRequest', () => {
  test('encodes through the NetworkService.subscribeMessages payload schema', () => {
    const request = createSubscribeRequest('aa'.repeat(32), ['type:status.update']);
    const encoded = Schema.encodeSync(NetworkService.SubscribeMessagesRequest)(request);
    const decoded = Schema.decodeSync(NetworkService.SubscribeMessagesRequest)(encoded);
    expect(decoded.peer.peerKey).toBe('aa'.repeat(32));
    expect(decoded.tags).toEqual(['type:status.update']);
  });
});
