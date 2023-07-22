//
// Copyright 2023 DXOS.org
//

import { GraphNode } from '@braneframe/plugin-graph';
import { UnsubscribeCallback } from '@dxos/async';
import { Query, SpaceProxy, subscribe, TypedObject, TypeFilter } from '@dxos/react-client/echo';
import { defaultMap } from '@dxos/util';

export class GraphNodeAdapter<T extends TypedObject> {
  private readonly _queries = new Map<string, Query<T>>();
  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();

  constructor(
    private readonly _filter: TypeFilter<T>,
    private readonly _adapter: (parent: GraphNode, object: T) => GraphNode,
  ) {}

  clear() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
    this._queries.clear();
  }

  createNodes(space: SpaceProxy, parent: GraphNode, emit: (node?: GraphNode) => void) {
    // Subscribe to query.
    const query = defaultMap(this._queries, parent.id, () => {
      const query = space.db.query(this._filter);
      this._subscriptions.set(
        parent.id,
        query.subscribe(() => emit()),
      );

      return query;
    });

    // Subscribe to all objects.
    return query.objects.map((object) => {
      defaultMap(this._subscriptions, object.id, () =>
        object[subscribe](() => {
          if (object.__deleted) {
            this._subscriptions.delete(object.id);
          } else {
            emit(this._adapter(parent, object));
          }
        }),
      );

      return this._adapter(parent, object);
    });
  }
}
