//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';

import { Timeframe } from './timeframe';

const log = debug('dxos:echo:spacetime:test');

const createFeedKey = () => {
  const { publicKey } = createKeyPair();
  return PublicKey.from(publicKey);
};

describe('spacetime', () => {
  test('constructors', () => {
    const feedKey = createFeedKey();

    const tf1 = new Timeframe([[feedKey, 1]]);
    log(tf1.toString());
    expect(tf1).toBeTruthy();
  });

  test('merge/subtract', () => {
    const feedKey1 = createFeedKey();
    const feedKey2 = createFeedKey();
    const feedKey3 = createFeedKey();

    {
      // Merge.
      const tf1 = new Timeframe();
      const tf2 = new Timeframe([[feedKey1, 2], [feedKey2, 1]]);
      const tf3 = Timeframe.merge(tf1, tf2);
      expect(tf3.frames()).toHaveLength(2);
    }

    {
      // Merge (no change).
      const tf1 = new Timeframe([[feedKey1, 1], [feedKey2, 1]]);
      const tf2 = new Timeframe([[feedKey1, 2], [feedKey3, 1]]);
      const tf3 = Timeframe.merge(tf1, tf2);
      expect(tf3.frames()).toHaveLength(3);
    }

    {
      // Merge (no change).
      const tf1 = new Timeframe([[feedKey1, 1]]);
      const tf2 = new Timeframe([[feedKey1, 3]]);
      const tf3 = new Timeframe([[feedKey1, 2]]);
      const tf4 = Timeframe.merge(tf1, tf2, tf3);
      log(tf4.toString());
      expect(tf4.frames()).toHaveLength(1);
      expect(tf4.get(feedKey1)).toBe(3);
    }

    {
      // Remove keys.
      const tf1 = new Timeframe([[feedKey1, 1], [feedKey2, 2]]);
      const tf2 = tf1.withoutKeys([feedKey1, feedKey3]);
      expect(tf2.frames()).toHaveLength(1);
    }
  });

  test('dependencies', () => {
    const feedKey1 = createFeedKey();
    const feedKey2 = createFeedKey();
    const feedKey3 = createFeedKey();

    {
      const tf1 = new Timeframe();
      const tf2 = new Timeframe();
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(0);
    }

    {
      const tf1 = new Timeframe();
      const tf2 = new Timeframe([[feedKey1, 10], [feedKey2, 11]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 10], [feedKey2, 10]]);
      const tf2 = new Timeframe();
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(2);
    }

    // TODO(burdon): Test 0.
    {
      const tf1 = new Timeframe([[feedKey1, 0]]);
      const tf2 = new Timeframe([[feedKey1, 0]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 1]]);
      const tf2 = new Timeframe([[feedKey1, 1]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf1.toString());
      log(tf2.toString());
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 10], [feedKey2, 10]]);
      const tf2 = new Timeframe([[feedKey1, 10], [feedKey2, 11]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 10], [feedKey2, 10], [feedKey3, 10]]);
      const tf2 = new Timeframe([[feedKey1, 10], [feedKey2, 9]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).toHaveLength(2);
    }
  });
});
