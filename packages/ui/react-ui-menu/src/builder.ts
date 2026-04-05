//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import type { MenuActionProperties, MenuItemGroupProperties } from '@dxos/ui-types';

import type { ActionGraphProps } from './hooks';
import { MenuSeparatorType } from './types';
import { createMenuAction, createMenuItemGroup } from './util';

/**
 * Builder for creating action graphs.
 */
export interface ActionGroupBuilder {
  /** Add an action node as a child of the current group. */
  action<P extends {} = {}>(id: string, props: P & MenuActionProperties, invoke: () => void): this;

  /** Add a nested action group. */
  group<P extends {} = {}>(
    id: string,
    props: P & MenuItemGroupProperties,
    cb: (builder: ActionGroupBuilder) => void,
  ): this;

  /** Merge pre-built nodes and edges into this builder. */
  // TODO(burdon): Option to pass in builder.
  subgraph(subgraph: ActionGraphProps): this;

  /** Add a separator. */
  separator(id?: string, variant?: 'gap' | 'line'): this;
}

export interface MenuBuilder extends ActionGroupBuilder {
  root(props: MenuItemGroupProperties): this;
  build(): ActionGraphProps;
}

class MenuBuilderImpl implements MenuBuilder {
  private _separatorCount = 0;

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

  build(): ActionGraphProps {
    return this._data;
  }

  action<P extends {} = {}>(id: string, props: P & MenuActionProperties, invoke: () => void): this {
    this._data.nodes.push(createMenuAction(id, invoke, props));
    this._data.edges.push({ source: this._rootId, target: id, relation: 'child' });
    return this;
  }

  group<P extends {} = {}>(
    id: string,
    props: P & MenuItemGroupProperties,
    cb: (builder: ActionGroupBuilder) => void,
  ): this {
    this._data.nodes.push(createMenuItemGroup(id, props));
    this._data.edges.push({ source: this._rootId, target: id, relation: 'child' });
    cb(new MenuBuilderImpl(this._data, id));
    return this;
  }

  subgraph(subgraph: ActionGraphProps): this {
    this._data.nodes.push(...subgraph.nodes);
    this._data.edges.push(...subgraph.edges);
    return this;
  }

  separator(id?: string, variant: 'gap' | 'line' = 'gap'): this {
    id ??= `separator-${++this._separatorCount}`;
    this._data.nodes.push({
      id,
      type: MenuSeparatorType,
      properties: { variant },
      data: undefined as never,
    });
    this._data.edges.push({ source: this._rootId, target: id, relation: 'child' });
    return this;
  }
}

export const MenuBuilder = Object.freeze({
  make: (): MenuBuilder => new MenuBuilderImpl({ nodes: [], edges: [] }, 'root'),
});
