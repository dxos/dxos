//
// Copyright 2024 DXOS.org
//

import { create, fromBinary, fromJson, toBinary, toJson } from '@bufbuild/protobuf';
import { expect } from 'chai';
import { describe, test } from 'vitest';

import {
  MessageSchema,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmRequestSchema,
  SwarmResponseSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';

import { Protocol } from './protocol';

describe('protocol', () => {
  test('protocol', () => {
    create;
    const protocol = new Protocol([SwarmRequestSchema, SwarmResponseSchema]);
    const message1 = protocol.createMessage(SwarmRequestSchema, { payload: { action: SwarmRequestAction.JOIN } });
    const data = toBinary(MessageSchema, message1);
    const message2 = fromBinary(MessageSchema, data);
    const request = protocol.getPayload(message2, SwarmRequestSchema);
    expect(request.action).to.eq(SwarmRequestAction.JOIN);
  });

  test('json', () => {
    const protocol = new Protocol([SwarmRequestSchema, SwarmResponseSchema]);
    const message1 = protocol.createMessage(SwarmRequestSchema, { payload: { action: SwarmRequestAction.JOIN } });
    const json = toJson(MessageSchema, message1, { registry: protocol.typeRegistry });
    const message2 = fromJson(MessageSchema, json, { registry: protocol.typeRegistry });
    const request = protocol.getPayload(message2, SwarmRequestSchema);
    expect(request.action).to.eq(SwarmRequestAction.JOIN);
  });
});
