//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { schema } from './proto';

describe('Codec', function () {
  it('encodes and decodes messages', async function () {
    const codec = schema.getCodecForType(
      'example.testing.data.TestItemMutation'
    );

    // TODO(burdon): Test substitutions.
    const buffer = codec.encode({
      key: 'key-1',
      value: 'value-1'
    });

    const { key, value } = codec.decode(buffer);

    expect(key).to.eq('key-1');
    expect(value).to.eq('value-1');
  });
});
