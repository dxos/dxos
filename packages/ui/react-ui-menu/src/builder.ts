import type { Edge } from '@dxos/app-graph';
import type { ActionGraphProps } from './hooks';
import type { MenuActionProperties, MenuItem, MenuItemGroupProperties } from './types';
import { createMenuAction, createMenuItemGroup } from './util';
import { invariant } from '@dxos/invariant';

export interface ActionGroupBuilder {
  action<P extends {} = {}>(id: string, invoke: () => void, properties: P & MenuActionProperties): this;
  group<P extends {} = {}>(
    id: string,
    properties: P & MenuItemGroupProperties,
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

  action<P extends {} = {}>(id: string, invoke: () => void, properties: P & MenuActionProperties): this {
    this._data.nodes.push(createMenuAction(id, invoke, properties));
    this._data.edges.push({ source: this._rootId, target: id });
    return this;
  }

  root(props: MenuItemGroupProperties): this {
    invariant(this._rootId === 'root', 'Root group can only be at the top level');
    invariant(this._data.nodes.find((node) => node.id === 'root') === undefined, 'Root group can only be created once');
    this._data.nodes.push(createMenuItemGroup('root', props));
    return this;
  }

  group<P extends {} = {}>(
    id: string,
    properties: P & MenuItemGroupProperties,
    cb: (builder: ActionGroupBuilder) => void,
  ): this {
    this._data.nodes.push(createMenuItemGroup(id, properties));
    this._data.edges.push({ source: this._rootId, target: id });
    cb(new MenuBuilderImpl(this._data, id));
    return this;
  }

  build(): ActionGraphProps {
    return this._data;
  }
}
