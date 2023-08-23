//
// Copyright 2023 DXOS.org
//

import { getIndices } from '@tldraw/indices';

import { Graph } from '@braneframe/plugin-graph';
import { UnsubscribeCallback } from '@dxos/async';
import { Filter } from '@dxos/echo-schema';
import { Query, Space, SpaceState, subscribe, TypedObject } from '@dxos/react-client/echo';
import { defaultMap } from '@dxos/util';

export { getIndices } from '@tldraw/indices';

export class GraphNodeAdapter<T extends TypedObject> {
  private readonly _queries = new Map<string, Query<T>>();
  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();
  private readonly _previousObjects = new Map<string, T[]>();

  constructor(
    private readonly _filter: Filter<T>,
    private readonly _adapter: (parent: Graph.Node, object: T, index: string) => Graph.Node,
  ) {}

  clear() {
    this._queries.clear();
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
    this._previousObjects.clear();
  }

  createNodes(space: Space, parent: Graph.Node) {
    if (space.state.get() !== SpaceState.READY) {
      return;
    }

    const query = defaultMap(
      this._queries,
      parent.id,
      () => space.db.query<T>(this._filter as any), // TODO(burdon): Fix types.
    );
    this._previousObjects.set(parent.id, query.objects);

    // TODO(burdon): Provided by graph?
    const indices = getIndices(query.objects.length);

    // Subscribe to query.
    this._subscriptions.set(
      parent.id,
      query.subscribe(() => {
        const previousObjects = this._previousObjects.get(parent.id) ?? [];
        const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
        this._previousObjects.set(parent.id, query.objects);
        removedObjects.forEach((object) => parent.remove(object.id));
        query.objects.forEach((object, index) => this._adapter(parent, object, indices[index]));
      }),
    );

    // Subscribe to all objects.
    query.objects.forEach((object, index) => {
      const id = `${parent.id}:${object.id}`;
      this._subscriptions.set(id, () =>
        object[subscribe](() => {
          if (object.__deleted) {
            this._subscriptions.get(id)?.();
            this._subscriptions.delete(id);
          } else {
            parent.add(this._adapter(parent, object, indices[index]));
          }
        }),
      );

      this._adapter(parent, object, indices[index]);
    });

    return () => {
      Array.from(this._subscriptions.keys())
        .filter((key) => key.startsWith(parent.id))
        .forEach((key) => {
          this._subscriptions.get(key)?.();
          this._subscriptions.delete(key);
        });
    };
  }
}
