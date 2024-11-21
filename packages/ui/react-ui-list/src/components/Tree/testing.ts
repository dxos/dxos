//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { Path } from '@dxos/react-ui-mosaic';

import { type ItemType } from './types';

export type TestItem = {
  id: string;
  name: string;
  icon?: string;
  items: TestItem[];
};

export const TestItemSchema = S.Struct({
  id: S.String,
  name: S.String,
  icon: S.optional(S.String),
  items: S.mutable(S.Array(S.suspend((): S.Schema<TestItem> => TestItemSchema))),
});

export const createTree = (n = 4, d = 4): TestItem => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  icon:
    d === 3
      ? undefined
      : faker.helpers.arrayElement([
          'ph--planet--regular',
          'ph--sailboat--regular',
          'ph--house--regular',
          'ph--gear--regular',
        ]),
  items: d > 0 ? faker.helpers.multiple(() => createTree(n, d - 1), { count: n }) : [],
});

function* visitor({
  testItem,
  getItem,
  isOpen,
}: {
  testItem: TestItem;
  getItem: (testItem: TestItem, parent?: readonly string[]) => ItemType;
  isOpen?: (testItem: ItemType) => boolean;
}): Generator<ItemType> {
  const stack: [TestItem, ItemType][] = [[testItem, getItem(testItem)]];
  while (stack.length > 0) {
    const [testItem, item] = stack.pop()!;
    if (item.path.length > 1) {
      yield item;
    }

    const children = Array.from(testItem.items ?? []);
    if (item.path.length === 1 || isOpen?.(item)) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        stack.push([child, getItem(child, item.path)]);
      }
    }
  }
}

export const flattenTree = (tree: TestItem, open: string[], getItem: (tree: TestItem) => ItemType): ItemType[] => {
  return Array.from(
    visitor({
      testItem: tree,
      getItem,
      isOpen: ({ path }) => open.includes(Path.create(...path)),
    }),
  );
};

// Ensures that the same item is not created multiple times, causing the tree to be re-rendered.
const itemsCache: Record<string, ItemType> = {};

export const getItem = (testItem: TestItem, parent?: string[]): ItemType => {
  const cachedItem = itemsCache[testItem.id];
  if (cachedItem) {
    return cachedItem;
  }

  const item = {
    id: testItem.id,
    label: testItem.name,
    icon: testItem.icon,
    path: parent ? [...parent, testItem.id] : [testItem.id],
    ...((testItem.items?.length ?? 0) > 0 && {
      parentOf: testItem.items!.map(({ id }) => id),
    }),
  };
  itemsCache[testItem.id] = item;
  return item;
};

export const invalidateCache = (id: string) => {
  delete itemsCache[id];
};

const removeItem = (tree: TestItem, source: ItemType) => {
  const parent = getTestItem(tree, source.path.slice(1, -1));
  const index = parent.items!.findIndex(({ id }) => id === source.id);
  const item = parent.items[index];
  parent.items!.splice(index, 1);
  return item;
};

const getTestItem = (tree: TestItem, path: string[]) => {
  let item = tree;
  for (const part of path) {
    item = item.items!.find(({ id }) => id === part)!;
  }
  return item;
};

// TODO(wittjosiah): Reconcile with plugin-navtree/testing/vistor.
export const updateState = ({
  state,
  instruction,
  source,
  target,
}: {
  state: TestItem;
  instruction: Instruction;
  source: ItemType;
  target: ItemType;
}) => {
  switch (instruction.type) {
    case 'reorder-above': {
      invalidateCache(source.id);
      const item = removeItem(state, source);
      const parent = getTestItem(state, target.path.slice(1, -1));
      const index = parent.items!.findIndex(({ id }) => id === target.id);
      invalidateCache(target.id);
      parent.items!.splice(index, 0, item);
      break;
    }

    case 'reorder-below': {
      invalidateCache(source.id);
      const item = removeItem(state, source);
      const parent = getTestItem(state, target.path.slice(1, -1));
      const index = parent.items!.findIndex(({ id }) => id === target.id);
      invalidateCache(target.id);
      parent.items!.splice(index + 1, 0, item);
      break;
    }

    case 'make-child': {
      invalidateCache(source.id);
      const item = removeItem(state, source);
      const parent = getTestItem(state, target.path.slice(1));
      invalidateCache(target.id);
      parent.items!.push(item);
      break;
    }

    case 'instruction-blocked':
      break;

    default:
      log.warn('Unsupported instruction', instruction);
      break;
  }
};
