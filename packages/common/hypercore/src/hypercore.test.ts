//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import hypercore, { AbstractValueEncoding } from 'hypercore';
import util from 'node:util';
import ram from 'random-access-memory';

import { Codec } from '@dxos/codec-protobuf';
import { createKeyPair } from '@dxos/crypto';

import { createCodecEncoding } from './crypto';

type TestItem = {
  key: string
  value: string
}

const codec: Codec<TestItem> = {
  encode: (obj: TestItem) => Buffer.from(JSON.stringify(obj)),
  decode: (buffer: Uint8Array) => JSON.parse(buffer.toString())
};

const valueEncoding: AbstractValueEncoding<TestItem> = createCodecEncoding(codec);

describe('Hypercore', function () {
  it('sanity', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const core = hypercore(ram, publicKey, { secretKey });

    {
      expect(core.length).to.eq(0);
      const append = util.promisify(core.append.bind(core));
      const seq = await append('test');
      expect(core.length).to.eq(1);
      expect(seq).to.eq(0);
    }

    {
      const get = util.promisify(core.get.bind(core));
      const block: any = await get(0);
      expect(block.toString()).to.eq('test');
    }
  });

  it('encoding with typed hypercore', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const core = hypercore<TestItem>(ram, publicKey, { secretKey, valueEncoding });

    {
      const append = util.promisify(core.append.bind(core));

      expect(core.length).to.eq(0);
      const seq = await append({
        key: 'test-1',
        value: 'test'
      });

      expect(core.length).to.eq(1);
      expect(seq).to.eq(0);
    }

    {
      const head = util.promisify(core.head.bind(core));

      const { key, value } = await head();
      expect(key).to.eq('test-1');
      expect(value).to.eq('test');
    }

    {
      const get = util.promisify(core.get.bind(core));

      const { key, value } = await get(0);
      expect(key).to.eq('test-1');
      expect(value).to.eq('test');
    }
  });
});
