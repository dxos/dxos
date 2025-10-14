//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import * as Schema from 'effect/Schema';

import { type HasId, ObjectId } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';

import { type TreeData } from './TreeItem';

export type TestItem = HasId & {
  name: string;
  icon?: string;
  items: TestItem[];
};

export const TestItemSchema = Schema.Struct({
  id: ObjectId,
  name: Schema.String,
  icon: Schema.optional(Schema.String),
  items: Schema.mutable(Schema.Array(Schema.suspend((): Schema.Schema<TestItem> => TestItemSchema))),
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

const removeItem = (tree: TestItem, source: TreeData) => {
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
  source: TreeData;
  target: TreeData;
}) => {
  switch (instruction.type) {
    case 'reorder-above': {
      const item = removeItem(state, source);
      const parent = getTestItem(state, target.path.slice(1, -1));
      const index = parent.items!.findIndex(({ id }) => id === target.id);
      parent.items!.splice(index, 0, item);
      break;
    }

    case 'reorder-below': {
      const item = removeItem(state, source);
      const parent = getTestItem(state, target.path.slice(1, -1));
      const index = parent.items!.findIndex(({ id }) => id === target.id);
      parent.items!.splice(index + 1, 0, item);
      break;
    }

    case 'make-child': {
      const item = removeItem(state, source);
      const parent = getTestItem(state, target.path.slice(1));
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
