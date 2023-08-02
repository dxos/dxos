//
// Copyright 2023 DXOS.org
//

import { getIndices } from '@tldraw/indices';

import { GraphNode } from '@braneframe/plugin-graph';
import { UnsubscribeCallback } from '@dxos/async';
import { Filter } from '@dxos/echo-schema';
import { Query, SpaceProxy, subscribe, TypedObject } from '@dxos/react-client/echo';
import { defaultMap } from '@dxos/util';

export { getIndices } from '@tldraw/indices';

export class GraphNodeAdapter<T extends TypedObject> {
  private readonly _queries = new Map<string, Query<T>>();
  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();

  constructor(
    private readonly _filter: Filter<T>,
    private readonly _adapter: (parent: GraphNode, object: T, index: string) => GraphNode,
  ) {}

  clear() {
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
    this._queries.clear();
  }

  createNodes(space: SpaceProxy, parent: GraphNode, emit: (node?: GraphNode) => void) {
    // Subscribe to query.
    const query = defaultMap(this._queries, parent.id, () => {
      const query = space.db.query<T>(this._filter as any); // TODO(burdon): Fix types.
      this._subscriptions.set(
        parent.id,
        query.subscribe(() => emit()),
      );

      return query;
    });

    // TODO(burdon): Provided by graph?
    const stackIndices = getIndices(query.objects.length);

    // Subscribe to all objects.
    return query.objects.map((object, index) => {
      defaultMap(this._subscriptions, object.id, () =>
        object[subscribe](() => {
          if (object.__deleted) {
            this._subscriptions.delete(object.id);
          } else {
            emit(this._adapter(parent, object, stackIndices[index]));
          }
        }),
      );

      return this._adapter(parent, object, stackIndices[index]);
    });
  }
}
