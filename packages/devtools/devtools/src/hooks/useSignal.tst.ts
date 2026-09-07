//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'tstyche';

import { type SignalResponse } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type SignalResponse as LegacySignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';

import { useSignal } from './useSignal';

// `SignalResponse` moved to `bufMessage` on `DevtoolsHost.subscribeToSignal`, so these pin the
// carrier's exposed type rather than the annotation the panel happens to write. A green build
// would not distinguish the two.

declare const response: SignalResponse;

describe('SignalResponse', () => {
  it('reaches the hook as the buf message', () => {
    expect(useSignal()).type.toBe<SignalResponse[]>();
    expect(response.$typeName).type.toBe<'dxos.devtools.host.SignalResponse'>();
  });

  it('models the oneof as a discriminated union', () => {
    // protobuf.js exposed `swarmEvent` and `message` as independent optional properties; reading
    // either off the buf message is a type error, which is what the 17 call sites had to change.
    expect(response.data.case).type.toBe<'swarmEvent' | 'message' | undefined>();
    expect(response).type.not.toBeAssignableTo<{ swarmEvent: unknown }>();
  });

  it('carries `receivedAt` as a Timestamp, not a Date', () => {
    expect(response.receivedAt).type.not.toBeAssignableTo<Date | undefined>();
    expect(response.receivedAt?.seconds).type.toBe<bigint | undefined>();
  });

  it('leaves the message payload packed', () => {
    // Resolving a `type_url` on the consumer is what the panel must not do; the payload stays an
    // `Any` and the views dispatch on `typeUrl`.
    const message = response.data.case === 'message' ? response.data.value : undefined;
    expect(message?.payload?.typeUrl).type.toBe<string | undefined>();
    expect(message?.payload?.value).type.toBe<Uint8Array | undefined>();
  });

  it('is no longer the protobuf.js type', () => {
    expect<LegacySignalResponse>().type.not.toBeAssignableTo<SignalResponse>();
  });
});
