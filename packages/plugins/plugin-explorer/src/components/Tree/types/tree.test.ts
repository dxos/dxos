//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { DataType } from '@dxos/schema';

import { createTree } from '../testing';

import { type Tree } from './tree';

faker.seed(0);

const print = (tree: Tree) => {
  let count = 0;
  tree.tranverse((node, i) => {
    console.log(''.padStart(i * 2, ' '), node.data);
    count++;
  });

  return count;
};

describe('tree', () => {
  test('tree', ({ expect }) => {
    {
      const tree = createTree();
      let count = 0;
      tree.tranverse(() => {
        count++;
      });
      expect(count).to.eq(tree.size);
      expect(count).to.eq(1);
    }
    {
      const tree = createTree([10]);
      let count = 0;
      tree.tranverse(() => {
        count++;
      });
      expect(count).to.eq(tree.size);
      expect(count).to.eq(1 + 10);
    }
    {
      const tree = createTree([10, 3, 1]);
      let count = 0;
      tree.tranverse(() => {
        count++;
      });
      expect(count).to.eq(tree.size);
      expect(count).to.eq(1 + 10 * (1 + 3 * (1 + 1))); // 71
    }
  });

  test('tree navigation', ({ expect }) => {
    const tree = createTree([2, 3, 1]);
    expect(tree.getParent(tree.root)).to.be.null;

    const nodes = tree.getChildNodes(tree.root);
    expect(nodes).to.have.length(2);

    const first = nodes[0];
    expect(first.children).to.have.length(3);
    const parent = tree.getParent(first);
    expect(parent).to.eq(tree.root);

    const [c1, c2, c3] = tree.getChildNodes(first);
    expect(tree.getParent(c1)).to.eq(first);
    expect(tree.getParent(c2)).to.eq(first);
    expect(tree.getParent(c3)).to.eq(first);

    const [g1] = tree.getChildNodes(c1);
    expect(tree.getParent(g1)).to.eq(c1);
  });

  /**
   *  root                       root                        root
   *   └── 1                      └── 1                       └── 1
   *       ├── 1.1                    ├── 1.1                     ├── 1.1
   *       ├── 1.2 <- indent          │   ├── 1.2 <- unindent     ├── 1.2
   *       ├── 1.3 <- indent          │   └── 1.3                 │   └── 1.3
   *       ├── 1.4                    ├── 1.4                     ├── 1.4
   *       └── 1.5                    └── 1.5                     └── 1.5
   */
  test('indent and unindent', async ({ expect }) => {
    const tree = createTree([1, 5]);
    const parent = tree.getNode(tree.root.children[0]);

    {
      const count = print(tree);
      expect(count).to.eq(1 + 1 * (1 + 5));
    }

    // Indent
    {
      const child = tree.getChildNodes(parent);
      tree.indentNode(child[1]);
      tree.indentNode(child[2]);
      expect(parent.children).to.have.length(3);
      expect(child[0].children).to.have.length(2);
    }

    {
      const count = print(tree);
      expect(count).to.eq(1 + 1 * (1 + 5));
    }

    // Unindent
    {
      const child = tree.getChildNodes(parent);
      const grandchild = tree.getChildNodes(child[0]);
      tree.unindentNode(grandchild[0]);
      expect(grandchild[0].children).to.have.length(1);
      expect(parent.children).to.have.length(4);
    }

    {
      const count = print(tree);
      expect(count).to.eq(1 + 1 * (1 + 5));
    }
  });

  test('task', ({ expect }) => {
    const task = Obj.make(DataType.Task.Task, { title: 'Test task.' });
    expect(task.title).to.eq('Test task.');

    const tree = createTree();
    const node = tree.addNode(tree.root);
    node.ref = Ref.make(task);
  });
});
