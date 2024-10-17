//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import type { ActorID } from './common';
import { MirrorMultiMap } from './mirror-multi-map';
import { inspect } from 'util';

test('insert and diff', async ({ expect }) => {
  const map: MirrorMultiMap<string> = await MirrorMultiMap.new({ actor: 'peer1' as ActorID });

  await map.setLocalBatch([
    ['a', '1'],
    ['b', '2'],
    ['c', '3'],
  ]);

  await map.setForBatch('peer2' as ActorID, [
    ['a', '1'],
    ['b', '3'],
    ['d', '4'],
  ]);

  const diff = await map.getDifferent();

  expect(diff).toEqual(
    new Map([
      [
        'b',
        new Map([
          ['peer1', '2'],
          ['peer2', '3'],
        ]),
      ],
      ['c', new Map([['peer1', '3']])],
      ['d', new Map([['peer2', '4']])],
    ]),
  );
});

test('sync', async ({ expect }) => {
  const peer1: MirrorMultiMap<string> = await MirrorMultiMap.new({ actor: 'peer1' as ActorID });
  const peer2: MirrorMultiMap<string> = await MirrorMultiMap.new({ actor: 'peer2' as ActorID });

  await peer1.setLocalBatch([
    ['a', '1'],
    ['b', '2'],
    ['c', '3'],
  ]);

  await peer2.setLocalBatch([
    ['a', '1'],
    ['b', '3'],
    ['d', '4'],
  ]);

  let rounds = 0;
  while (await sync(peer1, peer2)) {
    rounds++;
    if (rounds > 20) {
      throw new Error('sync failed');
    }
  }
  console.log({ rounds });

  expect(await peer1.getAll('a')).toEqual(
    new Map([
      ['peer1', '1'],
      ['peer2', '1'],
    ]),
  );
  expect(await peer1.getAll('b')).toEqual(
    new Map([
      ['peer1', '2'],
      ['peer2', '3'],
    ]),
  );
  expect(await peer1.getAll('c')).toEqual(
    new Map([
      ['peer1', '3'],
      ['peer2', undefined],
    ]),
  );
  expect(await peer1.getAll('d')).toEqual(
    new Map([
      ['peer1', undefined],
      ['peer2', '4'],
    ]),
  );
});

const sync = async (peer1: MirrorMultiMap<string>, peer2: MirrorMultiMap<string>, spy = false) => {
  const msg1 = await peer1.generateSyncMessage(peer2.localActorId);
  if (msg1) {
    await peer2.receiveSyncMessage(peer1.localActorId, msg1);
  }

  const msg2 = await peer2.generateSyncMessage(peer1.localActorId);
  if (msg2) {
    await peer1.receiveSyncMessage(peer2.localActorId, msg2);
  }

  if (spy) {
    console.log(
      inspect(
        {
          msg1,
          msg2,
        },
        false,
        null,
        true,
      ),
    );
  }

  return msg1 || msg2;
};
