//
// Copyright 2019 DXOS.org
//

import { expect } from 'chai';
import hypercore, { AbstractValueEncoding } from 'hypercore';
import util from 'node:util';

import { createKeyPair } from '@dxos/crypto';
import { schema } from '@dxos/protocols';
import { TestItemMutation } from '@dxos/protocols/proto/example/testing/data';

import { createCodecEncoding } from './crypto';
import { ramFactory } from './testing';

describe('Hypercore', function () {
  it('sanity', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const core = hypercore(ramFactory(), publicKey, { secretKey });

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
    // TODO(burdon): Create separate proto testing package.
    const codec = schema.getCodecForType('example.testing.data.TestItemMutation');
    const valueEncoding: AbstractValueEncoding<TestItemMutation> = createCodecEncoding(codec);

    const { publicKey, secretKey } = createKeyPair();
    const core = hypercore<TestItemMutation>(ramFactory(), publicKey, { secretKey, valueEncoding });

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
