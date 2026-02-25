//
// Copyright 2022 DXOS.org
//

import { bufWkt, create } from '@dxos/protocols/buf';

export const PAYLOAD_1: bufWkt.Any = create(bufWkt.AnySchema, {
  typeUrl: 'dxos.Example1',
  value: Buffer.from('1'),
});

export const PAYLOAD_2: bufWkt.Any = create(bufWkt.AnySchema, {
  typeUrl: 'dxos.Example2',
  value: Buffer.from('2'),
});

export const PAYLOAD_3: bufWkt.Any = create(bufWkt.AnySchema, {
  typeUrl: 'dxos.Example3',
  value: Buffer.from('3'),
});
