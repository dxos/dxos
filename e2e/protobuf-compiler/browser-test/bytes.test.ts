//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { schema } from '../../../tools/executors/protobuf-compiler/test/proto/gen';
import { Scalars } from '../../../tools/executors/protobuf-compiler/test/proto/gen/dxos/test';

it('bytes fields get decoded to Uint8Array', () => {
  const codec = schema.getCodecForType('dxos.test.Scalars');

  // eslint-disable-next-line
  // @ts-ignore
  const initial: Scalars = {
    bytesField: new Uint8Array(Buffer.from('world'))
  };

  const encoded = codec.encode(initial);
  expect(encoded).toBeInstanceOf(Uint8Array);

  const decoded = codec.decode(encoded);
  expect(decoded).toEqual(initial);
  expect(decoded.bytesField).toBeInstanceOf(Uint8Array);
});
