//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import type { MenuActionProperties, MenuItemGroupProperties } from '@dxos/ui-types';

import type { ActionGraphProps } from './hooks';
import { createMenuAction, createMenuItemGroup } from './util';

export interface ActionGroupBuilder {
  action<P extends {} = {}>(id: string, props: P & MenuActionProperties, invoke: () => void): this;
  group<P extends {} = {}>(
    id: string,
    props: P & MenuItemGroupProperties,
    cb: (builder: ActionGroupBuilder) => void,
  ): this;
}

export interface MenuBuilder extends ActionGroupBuilder {
  root(props: MenuItemGroupProperties): this;
  build(): ActionGraphProps;
}

export const MenuBuilder = Object.freeze({
  make: (): MenuBuilder => new MenuBuilderImpl({ nodes: [], edges: [] }, 'root'),
});

class MenuBuilderImpl implements MenuBuilder {
  constructor(
    private readonly _data: ActionGraphProps,
    private readonly _rootId: string,
  ) {}

  root(props: MenuItemGroupProperties): this {
    invariant(this._rootId === 'root', 'Root group can only be at the top level');
    invariant(this._data.nodes.find((node) => node.id === 'root') === undefined, 'Root group can only be created once');
    this._data.nodes.push(createMenuItemGroup('root', props));
    return this;
  }

  action<P extends {} = {}>(id: string, props: P & MenuActionProperties, invoke: () => void): this {
    this._data.nodes.push(createMenuAction(id, invoke, props));
    this._data.edges.push({ source: this._rootId, target: id });
    return this;
  }

  group<P extends {} = {}>(
    id: string,
    props: P & MenuItemGroupProperties,
    cb: (builder: ActionGroupBuilder) => void,
  ): this {
    this._data.nodes.push(createMenuItemGroup(id, props));
    this._data.edges.push({ source: this._rootId, target: id });
    cb(new MenuBuilderImpl(this._data, id));
    return this;
  }

  build(): ActionGraphProps {
    return this._data;
  }
}
