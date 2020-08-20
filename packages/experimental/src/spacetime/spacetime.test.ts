//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { createKeyPair } from '@dxos/crypto';

import { FeedKeyMapper, Spacetime } from './spacetime';

const log = debug('dxos:echo:spacetime:test');
debug.enable('dxos:echo:*');

describe('spacetime', () => {
  test('constructors', () => {
    const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

    const { publicKey: feedKey } = createKeyPair();

    const tf1 = spacetime.createTimeframe([[feedKey, 1]]);
    log(spacetime.stringify(tf1));
    expect(tf1).toBeTruthy();
  });

  test('merge/subtract', () => {
    const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

    const { publicKey: feedKey1 } = createKeyPair();
    const { publicKey: feedKey2 } = createKeyPair();
    const { publicKey: feedKey3 } = createKeyPair();

    {
      // Merge.
      const tf1 = spacetime.createTimeframe();
      const tf2 = spacetime.createTimeframe([[feedKey1, 2], [feedKey2, 1]]);
      const tf3 = spacetime.merge(tf1, tf2);
      log(JSON.stringify(spacetime.toJson(tf3), undefined, 2));
      expect(spacetime.keyMapper.toArray(tf3)).toHaveLength(2);
    }

    {
      // Merge (no change).
      const tf1 = spacetime.createTimeframe([[feedKey1, 1], [feedKey2, 1]]);
      const tf2 = spacetime.createTimeframe([[feedKey1, 2], [feedKey3, 1]]);
      const tf3 = spacetime.merge(tf1, tf2);
      log(JSON.stringify(spacetime.toJson(tf3), undefined, 2));
      expect(spacetime.keyMapper.toArray(tf3)).toHaveLength(3);
    }

    {
      // Merge (no change).
      const tf1 = spacetime.createTimeframe([[feedKey1, 1]]);
      const tf2 = spacetime.createTimeframe([[feedKey1, 3]]);
      const tf3 = spacetime.createTimeframe([[feedKey1, 2]]);
      const tf4 = spacetime.merge(tf1, tf2, tf3);
      log(spacetime.stringify(tf4));
      expect(spacetime.keyMapper.toArray(tf4)).toHaveLength(1);
      assert(tf4.frames);
      expect(tf4.frames[0].seq).toBe(3);
    }

    {
      // Remove keys.
      const tf1 = spacetime.createTimeframe([[feedKey1, 1], [feedKey2, 2]]);
      const tf2 = spacetime.removeKeys(tf1, [feedKey1, feedKey3]);
      log(spacetime.stringify(tf2));
      expect(spacetime.keyMapper.toArray(tf2)).toHaveLength(1);
    }
  });

  test('dependencies', () => {
    const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

    const { publicKey: feedKey1 } = createKeyPair();
    const { publicKey: feedKey2 } = createKeyPair();
    const { publicKey: feedKey3 } = createKeyPair();

    {
      const tf1 = spacetime.createTimeframe();
      const tf2 = spacetime.createTimeframe();
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(0);
    }

    {
      const tf1 = spacetime.createTimeframe();
      const tf2 = spacetime.createTimeframe([[feedKey1, 10], [feedKey2, 11]]);
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(0);
    }

    {
      const tf1 = spacetime.createTimeframe([[feedKey1, 10], [feedKey2, 10]]);
      const tf2 = spacetime.createTimeframe();
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(2);
    }

    // TODO(burdon): Test 0.
    {
      const tf1 = spacetime.createTimeframe([[feedKey1, 0]]);
      const tf2 = spacetime.createTimeframe([[feedKey1, 0]]);
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(0);
    }

    {
      const tf1 = spacetime.createTimeframe([[feedKey1, 1]]);
      const tf2 = spacetime.createTimeframe([[feedKey1, 1]]);
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf1));
      log(spacetime.stringify(tf2));
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(0);
    }

    {
      const tf1 = spacetime.createTimeframe([[feedKey1, 10], [feedKey2, 10]]);
      const tf2 = spacetime.createTimeframe([[feedKey1, 10], [feedKey2, 11]]);
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(0);
    }

    {
      const tf1 = spacetime.createTimeframe([[feedKey1, 10], [feedKey2, 10], [feedKey3, 10]]);
      const tf2 = spacetime.createTimeframe([[feedKey1, 10], [feedKey2, 9]]);
      const tf3 = spacetime.dependencies(tf1, tf2);
      log(spacetime.stringify(tf3));
      expect(tf3.frames).toHaveLength(2);
    }
  });
});
