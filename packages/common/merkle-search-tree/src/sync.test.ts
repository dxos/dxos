import { test } from 'vitest';
import { Tree } from './tree';
import { formatSyncMessage, generateSyncMessage, receiveSyncMessage } from './sync';
import { createValue } from './testing';

test('empty', async () => {
  const bench = await new TestBench().build();

  const { message } = await bench.syncForward();
  console.log(message.nodes);
});

test.only('one node', async () => {
  const bench = await new TestBench().build();
  await bench.own1.set('a', createValue('a'));

  await bench.syncForward({ printMessage: true });
  await bench.syncBackwards({ printMessage: true });

  bench.printTrees();

  await bench.syncForward({ printMessage: true });
  await bench.syncBackwards({ printMessage: true });

  bench.printTrees();
});

class TestBench {
  own1 = new Tree();
  remote1 = new Tree();

  own2 = new Tree();
  remote2 = new Tree();

  async build() {
    await this.own1.root.calculateDigest();
    await this.remote1.root.calculateDigest();
    await this.own2.root.calculateDigest();
    await this.remote2.root.calculateDigest();
    return this;
  }

  async syncForward({ printMessage = false }: { printMessage?: boolean } = {}) {
    const message = await generateSyncMessage(this.own1, this.remote1);
    const diff = await receiveSyncMessage(this.own2, this.remote2, message);
    if (printMessage) {
      console.log('->');
      console.log(formatSyncMessage(message));
    }
    return { message, diff };
  }

  async syncBackwards({ printMessage = false }: { printMessage?: boolean } = {}) {
    const message = await generateSyncMessage(this.own2, this.remote2);
    const diff = await receiveSyncMessage(this.own1, this.remote1, message);
    if (printMessage) {
      console.log('<-');
      console.log(formatSyncMessage(message));
    }
    return { message, diff };
  }

  printTrees() {
    console.log('Own 1:');
    console.log(this.own1.formatToString());
    console.log('Remote 1:');
    console.log(this.remote1.formatToString());
    console.log('Own 2:');
    console.log(this.own2.formatToString());
    console.log('Remote 2:');
    console.log(this.remote2.formatToString());
  }
}
