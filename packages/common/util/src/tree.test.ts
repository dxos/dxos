//
// Copyright 2023 DXOS.org
//

import { describe, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { type TreeNode, stringifyTree } from './tree';

describe('Tree logging', () => {
  test('simple', () => {
    const data: TreeNode[] = [
      { id: PublicKey.random().toHex() },
      {
        id: PublicKey.random().toHex(),
        children: [
          {
            id: PublicKey.random().toHex(),
            children: [
              { id: PublicKey.random().toHex() },
              {
                id: PublicKey.random().toHex(),
                children: [{ id: PublicKey.random().toHex() }, { id: PublicKey.random().toHex() }],
              },
            ],
          },
          { id: PublicKey.random().toHex() },
          { id: PublicKey.random().toHex() },
          {
            id: PublicKey.random().toHex(),
            children: [
              { id: PublicKey.random().toHex() },
              { id: PublicKey.random().toHex() },
              { id: PublicKey.random().toHex() },
            ],
          },
          { id: PublicKey.random().toHex() },
        ],
      },
    ];

    console.log('\nTests:');
    data.forEach((node, i) => {
      console.log(`Test ${i + 1}`);
      console.log(stringifyTree(node).join('\n'));
    });
  });
});
