//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { create, makeRef } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

import { TreeNodeType } from './tree';
import { getChildNodes, getParent } from './util';

faker.seed(0);

describe('util', () => {
  test('tree navigation', ({ expect }) => {
    const root = create(TreeNodeType, {
      text: faker.lorem.word(),
      children: range(10, (i) =>
        makeRef(
          create(TreeNodeType, {
            text: faker.lorem.word(),
            children: range(i % 2 === 0 ? 3 : 0, () =>
              makeRef(
                create(TreeNodeType, {
                  text: faker.lorem.word(),
                  children: [makeRef(create(TreeNodeType, { text: faker.lorem.word(), children: [] }))],
                }),
              ),
            ),
          }),
        ),
      ),
    });

    expect(getParent(root, root)).to.be.undefined;

    const nodes = getChildNodes(root);
    expect(nodes).to.have.length(10);

    const first = nodes[0];
    expect(first.children).to.have.length(3);

    const parent = getParent(root, first);
    expect(parent).to.eq(root);

    const [c1, c2, c3] = getChildNodes(first);
    expect(getParent(root, c1)).to.eq(first);
    expect(getParent(root, c2)).to.eq(first);
    expect(getParent(root, c3)).to.eq(first);

    const [g1] = getChildNodes(c1);
    expect(getParent(root, g1)).to.eq(c1);
  });
});
