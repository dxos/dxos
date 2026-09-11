//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { DataRequestSchema, SignalRequestSchema } from '@dxos/protocols/buf/dxos/mesh/bridge_pb';
import { SignalSchema } from '@dxos/protocols/buf/dxos/mesh/swarm_pb';

import { RtcTransportService } from './rtc-transport-service.ts';

describe('RtcTransportService', () => {
  // A proxy write and the bridge's own close race over separate channels, so a write for a transport
  // the bridge has already dropped is ordinary. Reporting it as an error tears the peer connection
  // down and costs a full transport-connect timeout on the next attempt.
  test('a write for a transport the bridge has closed is dropped, not reported', async () => {
    const service = new RtcTransportService();
    const proxyId = fromPublicKey(PublicKey.random());

    await expect(
      service.sendData(create(DataRequestSchema, { proxyId, payload: new Uint8Array([1, 2, 3]) })),
    ).resolves.toBeDefined();
    await expect(
      service.sendSignal(create(SignalRequestSchema, { proxyId, signal: create(SignalSchema, {}) })),
    ).resolves.toBeDefined();
  });
});
