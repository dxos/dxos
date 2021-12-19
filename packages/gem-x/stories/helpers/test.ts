//
// Copyright 2021 DXOS.org
//

import { Graph, GraphRenderer, GraphForceProjector } from './graph';
import { ObjectId, Scene, Surface } from './scene';

const renderer = new GraphRenderer();

type TestModel = {
  items: {
    id: ObjectId,
    parent?: ObjectId
  }[]
}

export const scene = new Scene<TestModel>([
  // TODO(burdon): Generalize based on paths/filter.
  new GraphForceProjector((model: TestModel, layout: Graph) => {
    const updated: Graph = {
      nodes: [],
      links: []
    };

    // Merge nodes.
    model.items.forEach(({ id }) => {
      const node = layout.nodes.find(node => node.id === id) ?? { id };
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
  }, renderer)
]);

// TODO(burdon): Model subscription.
export const createModel = (maxDepth = 4): TestModel => {
  const items = [];

  const sub = (root, maxDepth = 4, maxChildren = 4, depth = 0) => {
    items.push(root);

    if (depth < maxDepth) {
      Array.from({ length: Math.round(1 + Math.random() * (maxChildren - 1)) }).forEach((_, i) => {
        sub({
          id: `item-${root.id}-${i}`,
          parent: root.id
        }, maxDepth, maxChildren, depth + 1);
      });
    }
  };

  sub({
    id: 'item-0'
  }, maxDepth);

  console.log(JSON.stringify(items, undefined, 2));

  return { items };
};

export const test = () => {
  const surface: Surface = undefined;

  scene.start(surface);
  scene.update(createModel());
  scene.stop();
};
