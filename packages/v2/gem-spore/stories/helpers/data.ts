//
// Copyright 2021 DXOS.org
//

import faker from 'faker';

import { GraphLayout, ObjectId } from '../../src';
import { Stats } from './stats';

// TODO(burdon): Replace with Graph data generator.

export type TestItem = {
  id: ObjectId
  parent?: ObjectId
  children: ObjectId[]
  type: string
}

export type TestModel = {
  items: TestItem[]
}

// TODO(burdon): Model subscription.
export const createModel = (maxDepth = 4): TestModel => {
  const items = [];

  const sub = (root, maxDepth = 4, maxChildren = 4, depth = 0) => {
    items.push(root);
    if (depth < maxDepth) {
      const children = Math.round(1 + Math.random() * (maxChildren - 1));
      Array.from({ length: children }).forEach(() => {
        const id = faker.datatype.uuid();
        root.children.push(id);

        sub({
          id,
          parent: root.id,
          children: []
        }, maxDepth, maxChildren, depth + 1);
      });
    }
  };

  sub({
    id: faker.datatype.uuid(),
    children: []
  }, maxDepth);

  return { items };
};

export const updateModel = (model: TestModel) => {
  const parent = model.items.length ? model.items[Math.floor(Math.random() * model.items.length)] : undefined;

  // Delete item.
  if (parent && Math.random() < 0.05) {
    // console.log('remove', parent.id);
    model.items = model.items.filter(item => item.id !== parent.id);
    model.items.forEach(item => {
      if (item.parent === parent.id) {
        item.parent = undefined;
      }
    });

    return;
  }

  const id = faker.datatype.uuid();
  if (parent) {
    parent.children.push(id);
  }

  model.items.push({
    id,
    parent: parent?.id,
    children: [],
    type: faker.random.arrayElement(['org', 'person', 'project', 'task'])
  });
};

export const statsMapper = (model: TestModel): Stats => {
  return {
    nodes: model.items.length
  };
};

// TODO(burdon): Generalize based on paths/filter.
export const graphMapper = (model: TestModel, layout: GraphLayout): GraphLayout => {
  const updated: GraphLayout = {
    graph: {
      nodes: [],
      links: []
    }
  };

  const { graph } = layout || {};

  // Merge nodes.
  model.items.forEach(data => {
    const { id } = data;
    const node = graph?.nodes.find(node => node.id === id) ?? { id, data };
    updated.graph.nodes.push(node);
  });

  // Merge links.
  updated.graph.links = []; // TODO(burdon): Merge links (remove if node deleted).
  model.items.forEach(({ id, parent }) => {
    if (parent) {
      const linkId = `${id}-${parent}`;
      const link = /*graph?.links.find(link => link.id === linkId) ??*/ {
        id: linkId,
        source: updated.graph.nodes.find(node => node.id === parent),
        target: updated.graph.nodes.find(node => node.id === id)
      };

      updated.graph.links.push(link);
    }
  });

  return updated;
};
