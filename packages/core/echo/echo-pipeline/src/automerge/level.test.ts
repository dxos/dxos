//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Level } from 'level';
import { type MixedEncoding } from 'level-transcoder';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { describe, openAndClose, test } from '@dxos/test';

import { type SubLevelDB } from './types';
import { createTestLevel } from '../testing';

describe('Level', () => {
  test('missing keys', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    expect(() => level.get('missing')).to.throw;
  });

  test('data persistance after reload', async () => {
    const path = `/tmp/dxos-${PublicKey.random().toHex()}`;
    const level = new Level<string, string>(path);
    await level.open();

    const key = 'name';
    const value = 'Rich';
    {
      await level.put(key, value);
      expect(await level.get(key)).to.equal(value);
    }

    await level.close();

    {
      const level = new Level<string, string>(path);
      await level.open();
      expect(await level.get(key)).to.equal(value);
      await level.clear();
      expect(() => level.get(key)).to.throw;
    }
  });

  test('batch different sublevels', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    const first: SubLevelDB = level.sublevel('first');
    const second: SubLevelDB = level.sublevel('second');

    const batch = first.batch();

    const key = 'key';
    const value = 'first-level-value';
    batch.put(key, value, { sublevel: second });
    await batch.write();

    expect(() => first.get(key)).to.throw;
    expect(await level.sublevel('second').get(key)).to.equal(value);
    expect(await second.get(key)).to.equal(value);
    expect(await second.iterator().all()).to.deep.equal([[key, value]]);
  });

  test('sublevel prefixes', () => {
    const level = createTestLevel();
    expect(level.prefixKey('', 'utf8')).to.equal('');

    {
      const sublevel = level.sublevel('sublevel');
      expect(sublevel.prefixKey('', 'utf8')).to.equal('!sublevel!');
    }

    {
      const sublevel = level.sublevel('');
      expect(sublevel.prefixKey('', 'utf8')).to.equal('!!');

      const sublevel2 = sublevel.sublevel('');
      expect(sublevel2.prefixKey('', 'utf8')).to.equal('!!!!');
    }
  });

  test.only('swap encoding', async () => {
    const level = createTestLevel();
    await openAndClose(level);

    const encoding: MixedEncoding<string, string, string> = {
      encode: (value: string): string => value + '_old',
      decode: (encodedValue: string): string => encodedValue.replace('_old', ''),
    };

    const subLevel = level.sublevel('sublevel');

    const key = 'key';
    const value = 'value';

    await subLevel.put(key, value, { valueEncoding: encoding });

    // Swap encoding
    const newEncoding: MixedEncoding<string, Uint8Array, string> = {
      encode: (value: string): Uint8Array => Buffer.from(value + 'new'),
      decode: (encodedValue: Uint8Array): string => {
        log.info('encoded', { value: Buffer.from(encodedValue).toString() });
        return Buffer.from(encodedValue).toString();
      },
    };

    expect(await subLevel.get(key, { valueEncoding: newEncoding })).to.equal(value);
  });
});
