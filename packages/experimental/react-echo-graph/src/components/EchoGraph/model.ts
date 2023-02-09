//
// Copyright 2022 DXOS.org
//

import { Item, DocumentModel, SPACE_ITEM_TYPE } from '@dxos/client';
import { GraphData, GraphModel } from '@dxos/gem-spore';

/**
 * ECHO adapter for the Graph model.
 * @deprecated
 */
export class EchoGraphModel extends GraphModel<Item<DocumentModel>> {
  private readonly _graph: GraphData<Item<DocumentModel>> = {
    nodes: [],
    links: []
  };

  get graph() {
    return this._graph;
  }

  update(items: Item<DocumentModel>[]) {
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
