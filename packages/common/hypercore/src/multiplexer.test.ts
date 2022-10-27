//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';
import util from 'node:util';
import { PassThrough, Transform } from 'streamx';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { HypercoreFactory } from './hypercore-factory';
import { Multiplexer } from './multiplexer';

const noop = () => {};

const py = (obj: any, fn: Function) => util.promisify(fn.bind(obj));

describe('Multiplexing', function () {
  it('multiplexes feeds', async function () {
    const plex1 = new Multiplexer('A');
    const plex2 = new Multiplexer('B');

    await plex1.open();
    await plex2.open();

    const numFeeds = 3;
    const factory = new HypercoreFactory();
    const feeds = await Promise.all(
      Array.from(Array(numFeeds)).map(async () => {
        const { publicKey, secretKey } = createKeyPair();
        const core1 = factory.createFeed(publicKey, { secretKey });
        const core2 = factory.createFeed(publicKey);

        await py(core1, core1.open)();
        await py(core2, core2.open)();

        plex1.addFeed(core1, true);
        plex2.addFeed(core2);
        return [core1, core2];
      })
    );

    feeds.forEach(([core1, core2]) => {
      expect(core1.stats.peers.length).to.eq(1);
      expect(core2.stats.peers.length).to.eq(1);
    });

    const [closed, setClosed] = latch({ count: 2 });
    plex1.output.pipe(plex2.input, setClosed);
    plex2.output.pipe(plex1.input, setClosed);

    const numMessages = 10;
    const written = new Set<string>();
    Array.from(Array(numMessages)).forEach((_, i) => {
      const [core] = faker.random.arrayElement(feeds);
      written.add(core.key.toString());
      core.append(`test-${i}: ${faker.lorem.sentence(10)}`, noop); // Long message.
    });

    {
      const [synced, setSynced] = latch({ count: written.size });
      feeds.forEach(([, core2]) => {
        core2.on('sync', () => {
          log('sync', { feedKey: PublicKey.from(core2.key) });
          setSynced();
        });
      });

      await synced();
    }

    await plex1.close();
    await plex2.close();
    await closed();

    expect(plex1.isOpen).to.be.false;
    expect(plex2.isOpen).to.be.false;

    const count = feeds.reduce((total, [, core2]) => total + core2.length, 0);
    expect(count).to.eq(numMessages);
  });

  it('pipelines', async function () {
    const factory = new HypercoreFactory();
    const { publicKey, secretKey } = createKeyPair();
    const core1 = factory.createFeed(publicKey, { secretKey });
    const core2 = factory.createFeed(publicKey);

    await py(core1, core1.open)();
    await py(core2, core2.open)();

    const stream1 = core1.replicate(true, { live: true });
    const stream2 = core2.replicate(false, { live: true });

    //
    // Pipeline
    //

    const createWireTap = (label: string) =>
      new Transform({
        transform: (data: Buffer, next: (err: Error | null, data: Buffer) => void) => {
          log(label, { length: data.length });
          next(null, data);
        }
      });

    const [pipelineClosed, onStreamClose] = latch({ count: 2 });
    const createPipeline = (type: number) => {
      switch (type) {
        case 1:
          // prettier-ignore
          return stream1
            .pipe(stream2, onStreamClose)
            .pipe(stream1, onStreamClose);

        case 2:
          // prettier-ignore
          return stream1
            .pipe(new PassThrough())
            .pipe(stream2, onStreamClose)
            .pipe(new PassThrough())
            .pipe(stream1, onStreamClose);

        case 3:
          // prettier-ignore
          return stream1
            .pipe(createWireTap('SEND'))
            .pipe(stream2, onStreamClose)
            .pipe(createWireTap('RECV'))
            .pipe(stream1, onStreamClose);
      }
    };

    const pipeline = createPipeline(3);
    expect(core1.stats.peers).to.have.lengthOf(1);
    expect(core2.stats.peers).to.have.lengthOf(1);

    //
    // Sync
    //

    const numMessages = 10;
    const [synced, setSynced] = latch();
    core2.on('sync', () => {
      log('sync', { send: core1.stats.totals, recv: core1.stats.totals });
      expect(core2.length).to.eq(10);
      setSynced();
    });

    Array.from(Array(numMessages)).map((_, i) => core1.append(`test-${i}: ${faker.lorem.sentence()}`, noop));
    await synced();

    //
    // Close
    //

    {
      pipeline.finalize();
      await pipelineClosed();

      const [feedsClosed, done] = latch({ count: 2 });
      core1.close(done);
      core2.close(done);
      await feedsClosed();

      expect(core1.closed).to.be.true;
      expect(core2.closed).to.be.true;
    }
  });
});
