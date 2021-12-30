//
// Copyright 2021 DXOS.org
//

import faker from 'faker';

import { Graph, ObjectId, Stats } from '../../src';

export type TestModel = {
  items: {
    id: ObjectId,
    parent?: ObjectId, // TODO(burdon): Data object.
    children: ObjectId[]
  }[]
}

// TODO(burdon): Model subscription.
export const createModel = (maxDepth = 4): TestModel => {
  const items = [];

  const sub = (root, maxDepth = 4, maxChildren = 4, depth = 0) => {
    items.push(root);

    if (depth < maxDepth) {
      Array.from({ length: Math.round(1 + Math.random() * (maxChildren - 1)) }).forEach(() => {
        const id = `item-${faker.datatype.uuid()}`;
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
    id: 'item-0',
    children: []
  }, maxDepth);

  return { items };
};

export const updateModel = (model: TestModel) => {
  const parent = model.items[Math.floor(Math.random() * model.items.length)];

  // TODO(burdon): Delete item.
  if (Math.random() < 0.05) {
    model.items = model.items.filter(n => n.id !== parent.id);
    model.items.forEach(n => {
      if (n.parent === parent.id) {
        n.parent = undefined;
      }
    });

    return;
  }

  const id = `item-${faker.datatype.uuid()}`;
  parent.children.push(id);

  model.items.push({
    id,
    parent: parent.id,
    children: []
  });
};

export const statsMapper = (model: TestModel): Stats => {
  return {
    nodes: model.items.length
  };
};

// TODO(burdon): Generalize based on paths/filter.
export const graphMapper = (model: TestModel, layout: Graph): Graph => {
  const updated: Graph = {
    nodes: [],
    links: []
  };

  // Merge nodes.
  model.items.forEach((data) => {
    const { id } = data;
    const node = layout.nodes.find(node => node.id === id) ?? { id, data };
    updated.nodes.push(node);
  });

  // Merge links.
  model.items.forEach(({ id, parent }) => {
    if (parent) {
      const linkId = `${id}-${parent}`;
      updated.links.push(layout.links.find(link => link.id === linkId) ?? {
        id: linkId,
        source: updated.nodes.find(node => node.id === id),
        target: updated.nodes.find(node => node.id === parent)
      });
    }
  });

  return updated;
};
