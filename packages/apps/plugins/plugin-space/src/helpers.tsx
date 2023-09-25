//
// Copyright 2023 DXOS.org
//

import { PencilSimpleLine, Trash } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { getPersistenceParent } from '@braneframe/plugin-treeview';
import { Filter } from '@dxos/echo-schema';
import { Space, SpaceState, TypedObject } from '@dxos/react-client/echo';

import { effect } from '@preact/signals-react';
import { SPACE_PLUGIN, SpaceAction } from './types';

export { getIndices } from '@tldraw/indices';

export type GraphNodeAdapterOptions<T extends TypedObject> = {
  filter: Filter<T>;
  adapter: (parent: Graph.Node, object: T, index: string) => Graph.Node;
  // TODO(burdon): ???
  createGroup?: (parent: Graph.Node) => Graph.Node;
};

// TODO(burdon): Reconcile with GraphNodeBuilder.
export class GraphNodeAdapter<T extends TypedObject> {
  private readonly _filter: Filter<T>;
  private readonly _adapter: (parent: Graph.Node, object: T, index: string) => Graph.Node;
  private readonly _createGroup?: (parent: Graph.Node) => Graph.Node;
  private _group?: Graph.Node;

  constructor({ filter, adapter, createGroup }: GraphNodeAdapterOptions<T>) {
    this._filter = filter;
    this._createGroup = createGroup;

    this._adapter = (parent, object, index) => {
      console.log('add object to graph', { parentId: parent.id, typename: object.__typename, objId: object.id, parent, object, index,  })

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

      return child!;
    };
  }

  clear() { }

  createNodes(space: Space, parent: Graph.Node) {
    if (space.state.get() !== SpaceState.READY) { // TODO(dmaretskyi): Turn into subscription.
      return;
    }

    const getObjectParent = () => (this._createGroup ? this._group : parent);

    const query = space.db.query<T>(this._filter as any);
    const indices = getIndices(query.objects.length);
    let previousObjects: T[] = [];
    const clear = effect(() => {
      const objectParent = getObjectParent();
      if (!objectParent) {
        return;
      }

      const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
      previousObjects = query.objects;

      removedObjects.forEach((object) => objectParent.removeNode(object.id));
      query.objects.forEach((object, index) => this._adapter(objectParent, object, indices[index]));
    })

    if (this._createGroup && query.objects.length > 0) {
      this._group = this._createGroup(parent);
    }

    return clear;
  }
}
