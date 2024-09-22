import { test } from 'vitest';
import { LWWTree, initSyncState, type ActorID, type SyncMessage } from './lww-tree';

test('sim', async ({ expect }) => {
  const peer1 = await LWWTree.new({ actor: 'peer1' as ActorID });
  const peer2 = await LWWTree.new({ actor: 'peer2' as ActorID });
  let state1 = initSyncState(),
    state2 = initSyncState();

  const sync = async () => {
    for (let i = 0; i < 15; i++) {
      let message1: SyncMessage | null = null,
        message2: SyncMessage | null = null;
      console.log('state1', state1);
      [state1, message1] = await peer1.generateSyncMessage(state1);
      if (message1) {
        console.log('1 -> 2', { ...message1, nodes: message1.nodes.map((node) => ({ ...node, items: undefined })) });

        state2 = await peer2.receiveSyncMessage(state2, message1);
      }
      console.log('state2', state2);

      [state2, message2] = await peer2.generateSyncMessage(state2);
      if (message2) {
        console.log('2 -> 1', { ...message2, nodes: message2.nodes.map((node) => ({ ...node, items: undefined })) });
        state1 = await peer1.receiveSyncMessage(state1, message2);
      }

      if (!message1 && !message2) {
        console.log(`synced in ${i - 1} iterations`);
        return;
      }
    }
    throw new Error('sync failed');
  };

  await peer1.set('a', '1');
  await peer2.set('b', '2');
  await sync();
  expect(await peer1.get('a')).toBe('1');
  expect(await peer2.get('a')).toBe('1');
  expect(await peer1.get('b')).toBe('2');
  expect(await peer2.get('b')).toBe('2');

  await peer1.set('a', '3');
  await peer2.set('a', '4');
  await sync();
  expect(await peer1.get('a')).toBe('4');
  expect(await peer2.get('a')).toBe('4');
});
