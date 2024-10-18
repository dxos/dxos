//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { faker } from '@dxos/random';

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

export const createTree = (n = 3, d = 3): TestItem => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  icon: faker.helpers.arrayElement([
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
  isOpen?: (testItem: TestItem) => boolean;
}): Generator<ItemType> {
  const stack: [TestItem, ItemType][] = [[testItem, getItem(testItem)]];
  while (stack.length > 0) {
    const [testItem, item] = stack.pop()!;
    if (item.path.length > 1) {
      yield item;
    }

    const children = Array.from(testItem.items ?? []);
    if (item.path.length === 1 || isOpen?.(testItem)) {
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
      isOpen: ({ id }) => open.includes(id),
    }),
  );
};
