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

// TODO(burdon): Generate graph data set.
export const model: TestModel = {
  items: [
    {
      id: 'item-1'
    },
    {
      id: 'item-2',
      parent: 'item-1'
    },
    {
      id: 'item-3',
      parent: 'item-1'
    },
    {
      id: 'item-4',
      parent: 'item-3'
    },
    {
      id: 'item-5',
      parent: 'item-3'
    }
  ]
};

export const test = () => {
  const surface: Surface = undefined;

  // TODO(burdon): Model subscription.
  scene.start(surface);
  scene.update(model);
  scene.stop();
};
