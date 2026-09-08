//
// Copyright 2022 DXOS.org
//

import { type AnyEnvelope } from '@dxos/protocols/service-contract';

export const PAYLOAD_1: AnyEnvelope = {
  typeUrl: 'dxos.Example1',
  value: Buffer.from('1'),
};

export const PAYLOAD_2: AnyEnvelope = {
  typeUrl: 'dxos.Example2',
  value: Buffer.from('2'),
};

export const PAYLOAD_3: AnyEnvelope = {
  typeUrl: 'dxos.Example3',
  value: Buffer.from('3'),
};
