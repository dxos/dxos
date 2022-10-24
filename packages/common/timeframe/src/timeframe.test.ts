//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import debug from 'debug';

import { PublicKey } from '@dxos/keys';

import { Timeframe } from './timeframe';

const log = debug('dxos:timeframe:test');

describe('spacetime', function () {
  it('constructors', function () {
    const feedKey = PublicKey.random();

    const tf1 = new Timeframe([[feedKey, 1]]);
    log(tf1.toString());
    expect(tf1).to.exist;
  });

  it('merge/subtract', function () {
    const feedKey1 = PublicKey.random();
    const feedKey2 = PublicKey.random();
    const feedKey3 = PublicKey.random();

    {
      // Merge.
      const tf1 = new Timeframe();
      const tf2 = new Timeframe([[feedKey1, 2], [feedKey2, 1]]);
      const tf3 = Timeframe.merge(tf1, tf2);
      expect(tf3.frames()).to.be.lengthOf(2);
    }

    {
      // Merge (no change).
      const tf1 = new Timeframe([[feedKey1, 1], [feedKey2, 1]]);
      const tf2 = new Timeframe([[feedKey1, 2], [feedKey3, 1]]);
      const tf3 = Timeframe.merge(tf1, tf2);
      expect(tf3.frames()).to.be.lengthOf(3);
    }

    {
      // Merge (no change).
      const tf1 = new Timeframe([[feedKey1, 1]]);
      const tf2 = new Timeframe([[feedKey1, 3]]);
      const tf3 = new Timeframe([[feedKey1, 2]]);
      const tf4 = Timeframe.merge(tf1, tf2, tf3);
      log(tf4.toString());
      expect(tf4.frames()).to.be.lengthOf(1);
      expect(tf4.get(feedKey1)).to.equal(3);
    }

    {
      // Remove keys.
      const tf1 = new Timeframe([[feedKey1, 1], [feedKey2, 2]]);
      const tf2 = tf1.withoutKeys([feedKey1, feedKey3]);
      expect(tf2.frames()).to.be.lengthOf(1);
    }
  });

  it('dependencies', function () {
    const feedKey1 = PublicKey.random();
    const feedKey2 = PublicKey.random();
    const feedKey3 = PublicKey.random();

    {
      const tf1 = new Timeframe();
      const tf2 = new Timeframe();
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(0);
    }

    {
      const tf1 = new Timeframe();
      const tf2 = new Timeframe([[feedKey1, 10], [feedKey2, 11]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 10], [feedKey2, 10]]);
      const tf2 = new Timeframe();
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(2);
    }

    // TODO(burdon): Test 0.
    {
      const tf1 = new Timeframe([[feedKey1, 0]]);
      const tf2 = new Timeframe([[feedKey1, 0]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 1]]);
      const tf2 = new Timeframe([[feedKey1, 1]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf1.toString());
      log(tf2.toString());
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 10], [feedKey2, 10]]);
      const tf2 = new Timeframe([[feedKey1, 10], [feedKey2, 11]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(0);
    }

    {
      const tf1 = new Timeframe([[feedKey1, 10], [feedKey2, 10], [feedKey3, 10]]);
      const tf2 = new Timeframe([[feedKey1, 10], [feedKey2, 9]]);
      const tf3 = Timeframe.dependencies(tf1, tf2);
      log(tf3.toString());
      expect(tf3.frames()).to.be.lengthOf(2);
    }
  });
});
