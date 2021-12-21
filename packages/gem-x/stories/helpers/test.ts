//
// Copyright 2021 DXOS.org
//

import { Graph, GraphRenderer, GraphForceProjector } from './graph';
import { ObjectId, Part, Scene, Surface } from './scene';

type TestModel = {
  items: {
    id: ObjectId,
    parent?: ObjectId
  }[]
}

export const createScene = () => {
  // TODO(burdon): Generalize based on paths/filter.
  const mapper = (model: TestModel, layout: Graph) => {
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
  };

  return new Scene<TestModel>([
    new Part<TestModel, any>(new GraphForceProjector(mapper), new GraphRenderer())
  ]);
};

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

  return { items };
};

export const test = () => {
  const surface: Surface = undefined;

  const scene = createScene();
  scene.update(createModel());
  scene.start(surface);
  scene.stop();
};
