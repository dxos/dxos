//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import {
  Message,
  SwarmRequest,
  SwarmResponse,
  SwarmRequest_Action as SwarmRequestAction,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { Protocol } from './protocol';

describe('protocol', () => {
  test('protocol', () => {
    const protocol = new Protocol([SwarmRequest, SwarmResponse]);
    const message1 = protocol.createMessage({ payload: new SwarmRequest({ action: SwarmRequestAction.JOIN }) });
    const data = message1.toBinary();
    const message2 = Message.fromBinary(data);
    const request = protocol.getPayload(message2, SwarmRequest);
    expect(request.action).to.eq(SwarmRequestAction.JOIN);
  });

  test('json', () => {
    const protocol = new Protocol([SwarmRequest, SwarmResponse]);
    const message1 = protocol.createMessage({ payload: new SwarmRequest({ action: SwarmRequestAction.JOIN }) });
    const json = message1.toJson({ typeRegistry: protocol.typeRegistry });
    const message2 = Message.fromJson(json, { typeRegistry: protocol.typeRegistry });
    const request = protocol.getPayload(message2, SwarmRequest);
    expect(request.action).to.eq(SwarmRequestAction.JOIN);
  });
});
