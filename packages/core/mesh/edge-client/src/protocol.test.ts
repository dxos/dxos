//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buf } from '@dxos/protocols/buf';
import {
  MessageSchema,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmRequestSchema,
  SwarmResponseSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { Protocol } from './protocol';

describe('protocol', () => {
  test('protocol', () => {
    const protocol = new Protocol([SwarmRequestSchema, SwarmResponseSchema]);
    const message1 = protocol.createMessage(SwarmRequestSchema, { payload: { action: SwarmRequestAction.JOIN } });
    const data = buf.toBinary(MessageSchema, message1);
    const message2 = buf.fromBinary(MessageSchema, data);
    const request = protocol.getPayload(message2, SwarmRequestSchema);
    expect(request.action).to.eq(SwarmRequestAction.JOIN);
  });

  test('json', () => {
    const protocol = new Protocol([SwarmRequestSchema, SwarmResponseSchema]);
    const message1 = protocol.createMessage(SwarmRequestSchema, { payload: { action: SwarmRequestAction.JOIN } });
    const json = buf.toJson(MessageSchema, message1, { registry: protocol.typeRegistry });
    const message2 = buf.fromJson(MessageSchema, json, { registry: protocol.typeRegistry });
    const request = protocol.getPayload(message2, SwarmRequestSchema);
    expect(request.action).to.eq(SwarmRequestAction.JOIN);
  });
});
