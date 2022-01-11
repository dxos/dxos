import { Stream } from '@dxos/codec-protobuf';
import expect from 'expect';

/**
 * We import the files by a path here, because:
 * - We don't want to clutter protobuf-compiler exports with testing stuff.
 * - Testing package is created separately because protobuf-compiler cannot use our toolchain (because of circular dependencies)
 * - Importing by path is fine because it is executed locally only, the package will be kept close to protobuf-compiler, and is not published.
*/

import { ComplexFields, Scalars, TaskList, TaskType, WithTimestamp } from '../../protobuf-compiler/test/proto/gen/dxos/test'
import { schema } from '../../protobuf-compiler/test/proto/gen'
import { MyKey } from '../../protobuf-compiler/test/my-key';

it('bytes fields get decoded to Uint8Array', () => {
  const codec = schema.getCodecForType('dxos.test.Scalars');

  const initial: Scalars = {
    bytesField: new Uint8Array(Buffer.from('world')),
  }

  const encoded = codec.encode(initial)
  
  expect(encoded).toBeInstanceOf(Uint8Array);

  const decoded = codec.decode(encoded)

  expect(decoded).toEqual(initial)
  expect(decoded.bytesField).toBeInstanceOf(Uint8Array)
})