//
// Copyright 2022 DXOS.org
//

import { type TaggedType } from '@dxos/codec-protobuf';
import { type TYPES } from '@dxos/protocols/proto';

export const PAYLOAD_1: TaggedType<TYPES, 'google.protobuf.Any'> = {
  $typeName: 'google.protobuf.Any',
  '@type': 'google.protobuf.Any',
  typeUrl: 'dxos.Example1',
  value: Buffer.from('1'),
};

export const PAYLOAD_2: TaggedType<TYPES, 'google.protobuf.Any'> = {
  $typeName: 'google.protobuf.Any',
  '@type': 'google.protobuf.Any',
  typeUrl: 'dxos.Example2',
  value: Buffer.from('2'),
};

export const PAYLOAD_3: TaggedType<TYPES, 'google.protobuf.Any'> = {
  $typeName: 'google.protobuf.Any',
  '@type': 'google.protobuf.Any',
  typeUrl: 'dxos.Example3',
  value: Buffer.from('3'),
};
