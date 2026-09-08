//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { ConnectionState } from '@dxos/protocols/buf/dxos/mesh/bridge_pb';

import {
  fromBufBridgeEvent,
  fromBufConnectionRequest,
  fromBufDataRequest,
  fromBufStatsResponse,
  toBufBridgeEvent,
  toBufConnectionRequest,
  toBufDataRequest,
  toBufStatsResponse,
} from './bridge-codec';

// The transport keeps the protobuf.js shapes while the RPC speaks buf, so every bridge call is a
// re-encode. A field lost here corrupts a live connection with no type error to catch it.
describe('bridge codec', () => {
  test('a connection request survives the round trip', ({ expect }) => {
    const request = {
      proxyId: PublicKey.random(),
      initiator: true,
      remotePeerKey: 'remote',
      ownPeerKey: 'own',
      topic: 'topic',
    };

    const returned = fromBufConnectionRequest(toBufConnectionRequest(request));
    expect(returned.proxyId.equals(request.proxyId)).to.be.true;
    expect(returned.initiator).to.eq(true);
    expect(returned.remotePeerKey).to.eq('remote');
    expect(returned.ownPeerKey).to.eq('own');
    expect(returned.topic).to.eq('topic');
  });

  test('the proxy id comes back as a PublicKey the transport can key a map by', ({ expect }) => {
    const proxyId = PublicKey.random();
    const returned = fromBufConnectionRequest(
      toBufConnectionRequest({ proxyId, initiator: false, remotePeerKey: '', ownPeerKey: '', topic: '' }),
    );

    // `RtcTransportService` looks its proxies up by this value; a plain message would never match.
    expect(returned.proxyId).to.be.instanceOf(PublicKey);
    expect(returned.proxyId.toHex()).to.eq(proxyId.toHex());
  });

  test('a data payload survives the round trip byte for byte', ({ expect }) => {
    const payload = new Uint8Array([0, 1, 127, 128, 255]);
    const returned = fromBufDataRequest(toBufDataRequest({ proxyId: PublicKey.random(), payload }));
    expect(new Uint8Array(returned.payload)).to.deep.eq(payload);
  });

  test('each bridge event variant survives the round trip', ({ expect }) => {
    const connection = fromBufBridgeEvent(toBufBridgeEvent({ connection: { state: ConnectionState.CONNECTED } }));
    expect(connection.connection?.state).to.eq(ConnectionState.CONNECTED);

    const withError = fromBufBridgeEvent(
      toBufBridgeEvent({ connection: { state: ConnectionState.CLOSED, error: 'boom' } }),
    );
    expect(withError.connection?.error).to.eq('boom');

    const data = fromBufBridgeEvent(toBufBridgeEvent({ data: { payload: new Uint8Array([7, 8]) } }));
    expect(data.data?.payload && new Uint8Array(data.data.payload)).to.deep.eq(new Uint8Array([7, 8]));
  });

  test('stats survive the round trip through google.protobuf.Struct', ({ expect }) => {
    const returned = fromBufStatsResponse(toBufStatsResponse({ stats: { bytesSent: 42, label: 'live' } }));
    expect(returned.stats).to.deep.eq({ bytesSent: 42, label: 'live' });
  });
});
