//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create, makeRef } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

import { TreeNodeType, TreeType } from './tree';
import { getChildNodes, getParent, indent, tranverse, unindent } from './util';

faker.seed(0);

// TODO(burdon): Is this the right datastructure? Refs vs nodes? Extensibility? Ref counting? Common with graph?

/**
 * Create hierarchical tree.
 */
const createTree = (count: number[] = []) => {
  const createNodes = (n: number = 0, label: string) =>
    range(n, (i) => create(TreeNodeType, { text: `${label}.${i + 1}`, children: [] }));

  const createChildNodes = (root: TreeNodeType, [count = 0, ...rest]: number[]) => {
    const nodes = createNodes(count, root.text);
    root.children.push(...nodes.map(makeRef));
    if (rest.length) {
      for (const node of nodes) {
        createChildNodes(node, rest);
      }
    }

    return root;
  };

  const root = create(TreeNodeType, { text: 'root', children: [] });
  return createChildNodes(root, count);
};

const print = (root: TreeNodeType) => {
  let count = 0;
  tranverse(root, (node, i) => {
    console.log(''.padStart(i * 2, ' '), node.text);
    count++;
  });

  return count;
};

describe('tree', () => {
  test('tree', ({ expect }) => {
    {
      const root = createTree();
      let count = 0;
      tranverse(root, () => count++);
      expect(count).to.eq(1);
    }
    {
      const root = createTree([10]);
      let count = 0;
      tranverse(root, () => count++);
      expect(count).to.eq(1 + 10);
    }
    {
      const root = createTree([10, 3, 1]);
      let count = 0;
      tranverse(root, () => count++);
      expect(count).to.eq(1 + 10 * (1 + 3 * (1 + 1))); // 71
    }
  });

  test('tree navigation', ({ expect }) => {
    const root = createTree([2, 3, 1]);
    expect(getParent(root, root)).to.be.undefined;

    const nodes = getChildNodes(root);
    expect(nodes).to.have.length(2);

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

  /*
       root                       root                        root
        └── 1                      └── 1                       └── 1
            ├── 1.1                    ├── 1.1                     ├── 1.1
            ├── 1.2 <- indent          │   ├── 1.2 <- unindent     ├── 1.2
            ├── 1.3 <- indent          │   └── 1.3                 │   └── 1.3
            └── 1.4                    └── 1.4                     └── 1.4
   */
  test('indent and unindent', async ({ expect }) => {
    const testBuilder = new TestBuilder();
    const client = new Client({
      services: testBuilder.createLocalClientServices(),
      types: [TreeType, TreeNodeType],
    });

    await client.initialize();
    await client.halo.createIdentity();
    await client.spaces.waitUntilReady();

    const root = createTree([1, 4]);
    const space = client.spaces.default;
    const tree = space.db.add(create(TreeType, { root: makeRef(root) }));
    expect(tree).to.exist;

    {
      const count = print(root);
      expect(count).to.eq(1 + 1 * (1 + 4));
    }

    // Indent
    {
      const parent = root.children[0].target!;
      indent(parent, 1);
      indent(parent, 1);
      expect(parent.children).to.have.length(2);
    }

    {
      const count = print(root);
      expect(count).to.eq(1 + 1 * (1 + 4));
    }

    // Unindent
    {
      const parent = root.children[0].target!.children[0].target!;
      expect(parent.children).to.have.length(2);
      const child = unindent(root, parent, 0);
      expect(child).to.exist;
      expect(parent.children).to.have.length(0);
      expect(root.children[0].target!.children).to.have.length(3);
    }

    {
      const count = print(root);
      expect(count).to.eq(1 + 1 * (1 + 4));
    }
  });
});
