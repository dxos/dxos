//
// Copyright 2023 DXOS.org
//

import { PencilSimpleLine, Trash } from '@phosphor-icons/react';
import { effect } from '@preact/signals-react';
import { getIndices } from '@tldraw/indices';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { getPersistenceParent } from '@braneframe/plugin-treeview';
import { type Filter } from '@dxos/echo-schema';
import { type Space, SpaceState, type TypedObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SpaceAction } from './types';

export { getIndices } from '@tldraw/indices'; // TODO(burdon): Wrap?

export type GraphNodeAdapterOptions<T extends TypedObject> = {
  filter: Filter<T>;
  adapter: (parent: Node, object: T, index: string) => Node;
  // TODO(burdon): ???
  createGroup?: (parent: Node) => Node;
};

// TODO(burdon): Reconcile with GraphNodeBuilder.
export class GraphNodeAdapter<T extends TypedObject> {
  private readonly _filter: Filter<T>;
  private readonly _adapter: (parent: Node, object: T, index: string) => Node;
  private readonly _createGroup?: (parent: Node) => Node;
  private _group?: Node;

  constructor({ filter, adapter, createGroup }: GraphNodeAdapterOptions<T>) {
    this._filter = filter;
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

      return child!;
    };
  }

  clear() {}

  createNodes(space: Space, parent: Node) {
    // TODO(dmaretskyi): Turn into subscription.
    if (space.state.get() !== SpaceState.READY) {
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
    });

    if (this._createGroup && query.objects.length > 0) {
      this._group = this._createGroup(parent);
    }

    return clear;
  }
}
