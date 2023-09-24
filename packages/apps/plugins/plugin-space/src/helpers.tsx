//
// Copyright 2023 DXOS.org
//

import { PencilSimpleLine, Trash } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { getPersistenceParent } from '@braneframe/plugin-treeview';
import { UnsubscribeCallback } from '@dxos/async';
import { Filter } from '@dxos/echo-schema';
import { Query, Space, SpaceState, TypedObject } from '@dxos/react-client/echo';

import { log } from '@dxos/log';
import { effect } from '@preact/signals-react';
import { SPACE_PLUGIN, SpaceAction } from './types';

export { getIndices } from '@tldraw/indices';

export type GraphNodeAdapterOptions<T extends TypedObject> = {
  filter: Filter<T>;
  adapter: (parent: Graph.Node, object: T, index: string) => Graph.Node;
  propertySubscriptions?: string[];
  // TODO(burdon): ???
  createGroup?: (parent: Graph.Node) => Graph.Node;
};

// TODO(burdon): Reconcile with GraphNodeBuilder.
export class GraphNodeAdapter<T extends TypedObject> {
  private readonly _queries = new Map<string, Query<T>>();
  private readonly _subscriptions = new Map<string, UnsubscribeCallback>();
  private readonly _previousObjects = new Map<string, T[]>();
  private readonly _filter: Filter<T>;
  private readonly _adapter: (parent: Graph.Node, object: T, index: string) => Graph.Node;
  private readonly _propertySubscriptions?: string[];
  private readonly _createGroup?: (parent: Graph.Node) => Graph.Node;
  private _group?: Graph.Node;

  constructor({ filter, adapter, propertySubscriptions, createGroup }: GraphNodeAdapterOptions<T>) {
    this._filter = filter;
    this._propertySubscriptions = propertySubscriptions;
    this._createGroup = createGroup;

    this._adapter = (parent, object, index) => {
      const child = adapter(parent, object, index);

      child.addAction({
        id: 'delete',
        label: ['delete object label', { ns: SPACE_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: getPersistenceParent(child, 'spaceObject')?.data?.key.toHex(), objectId: object.id },
        },
      });

      child.addAction({
        id: 'rename',
        label: ['rename object label', { ns: SPACE_PLUGIN }],
        icon: (props) => <PencilSimpleLine {...props} />,
        intent: {
          action: SpaceAction.RENAME_OBJECT,
          data: { spaceKey: getPersistenceParent(child, 'spaceObject')?.data?.key.toHex(), objectId: object.id },
        },
      });

      return child;
    };
  }

  clear() {
    this._queries.clear();
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.clear();
    this._previousObjects.clear();
  }

  createNodes(space: Space, parent: Graph.Node) {
    space.waitUntilReady().then(() => {
      if (this._subscriptions.has(space.key.toHex())) {
        log.warn('called multiple times', { space })
        return;
      }

      const query = space.db.query<T>(this._filter as any);

      const indices = getIndices(query.objects.length);

      const getObjectParent = () => (this._createGroup ? this._group : parent);

      const clear = effect(() => {
        const objectParent = getObjectParent();
        if (objectParent) {
          const previousObjects = this._previousObjects.get(space.key.toHex()) ?? [];
          const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
          this._previousObjects.set(space.key.toHex(), query.objects);
          removedObjects.forEach((object) => objectParent.removeNode(object.id));
          query.objects.forEach((object, index) => this._adapter(objectParent, object, indices[index]));
        }
      })

      this._subscriptions.set(space.key.toHex(), clear);

      // TODO(burdon): Provided by graph?

      if (this._createGroup && query.objects.length > 0) {
        this._group = this._createGroup(parent);
      }
    })


    return () => {
      Array.from(this._subscriptions.keys())
        .filter((key) => key.startsWith(space.key.toHex()))
        .forEach((key) => {
          this._subscriptions.get(key)?.();
          this._subscriptions.delete(key);
        });
    };
  }
}
