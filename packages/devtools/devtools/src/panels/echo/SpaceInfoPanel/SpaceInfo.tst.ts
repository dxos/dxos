//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'tstyche';

import { type SubscribeToSpacesResponse_SpaceInfo } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type SubscribeToSpacesResponse as LegacyResponse } from '@dxos/protocols/proto/dxos/devtools/host';

import { useSpacesInfo } from '../../../hooks';
import { type PipelineTableProps } from './PipelineTable';
import { SpaceProperties } from './SpaceProperties';

// Carrier group A: `DevtoolsHost.subscribeToSpaces` moved to `bufMessage`, so these pin the type the
// carrier hands over rather than the annotation the panels happen to write.

declare const info: SubscribeToSpacesResponse_SpaceInfo;

describe('SubscribeToSpacesResponse.SpaceInfo (group A)', () => {
  it('reaches both panels as the buf message', () => {
    expect(useSpacesInfo()).type.toBe<SubscribeToSpacesResponse_SpaceInfo[]>();
    expect<PipelineTableProps['metadata']>().type.toBe<SubscribeToSpacesResponse_SpaceInfo | undefined>();
    expect(SpaceProperties).type.toBeAssignableTo<
      (props: { space: any; metadata: SubscribeToSpacesResponse_SpaceInfo }) => any
    >();
  });

  it('carries `$typeName`', () => {
    expect(info.$typeName).type.toBe<'dxos.devtools.host.SubscribeToSpacesResponse.SpaceInfo'>();
  });

  it('carries the substituted fields as buf shapes, not domain classes', () => {
    // `key` was a `@dxos/keys` `PublicKey` under protobuf.js; `timeframe` was a `Timeframe` with
    // arithmetic on it. Both are now plain messages, which is why the call sites convert.
    expect(info.key).type.not.toBeAssignableTo<{ equals: (other: unknown) => boolean } | undefined>();
    expect(info.key?.data).type.toBe<Uint8Array | undefined>();
    expect(info.timeframe).type.not.toBeAssignableTo<{ totalMessages: () => number } | undefined>();
    expect(info.timeframe?.frames[0].feedKey).type.toBe<Uint8Array | undefined>();
    expect(info.timeframe?.$typeName).type.toBe<'dxos.echo.timeframe.TimeframeVector' | undefined>();
  });

  it('is no longer the protobuf.js type', () => {
    expect<LegacyResponse['spaces']>().type.not.toBeAssignableTo<SubscribeToSpacesResponse_SpaceInfo[]>();
  });
});
