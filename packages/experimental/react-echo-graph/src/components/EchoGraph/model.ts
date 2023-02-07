//
// Copyright 2022 DXOS.org
//

import { Item, ObjectModel, SPACE_ITEM_TYPE } from '@dxos/client';
import { GraphData, GraphModel } from '@dxos/gem-spore';

/**
 * ECHO adapter for the Graph model.
 * @deprecated
 */
// TODO(burdon): Remove.
export class EchoGraphModel extends GraphModel<Item<ObjectModel>> {
  private readonly _graph: GraphData<Item<ObjectModel>> = {
    nodes: [],
    links: []
  };

  get graph() {
    return this._graph;
  }

  update(items: Item<ObjectModel>[]) {
    const spaceItem = items.find((item) => item.type === SPACE_ITEM_TYPE);
    this._graph.nodes = items;
    this._graph.links = [];

    items.forEach((item) => {
      const { parent } = item;
      if (parent) {
        this._graph.links.push({
          id: `${parent.id}-${item.id}`,
          source: parent.id,
          target: item.id
        });
      } else if (spaceItem) {
        this._graph.links.push({
          id: `${spaceItem.id}-${item.id}`,
          source: spaceItem.id,
          target: item.id
        });
      }
    });

    this.triggerUpdate();
  }
}
