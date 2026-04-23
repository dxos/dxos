//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import type { MenuActionProperties, MenuItemGroupProperties } from '@dxos/ui-types';

import type { ActionGraphProps } from './hooks';
import { MenuSeparatorType } from './types';
import { createMenuAction, createMenuItemGroup } from './util';

/** Callback that populates an action group builder. */
export type ActionGroupBuilderFn = (builder: ActionGroupBuilder) => void;

/**
 * Fluent builder for composing menu action graphs.
 * Subgraph functions return a callback that receives the builder, enabling composition via partial application:
 * ```ts
 * const addHeadings = (state): ActionGroupBuilderFn => (builder) => {
 *   builder.group('headings', { ... }, (group) => { ... });
 * };
 *
 * MenuBuilder.make()
 *   .subgraph(showHeadings && addHeadings(state))
 *   .subgraph(showFormatting && addFormatting(state))
 *   .build();
 * ```
 */
export interface ActionGroupBuilder {
  /** Add an action node as a child of the current group. */
  action<P extends {} = {}>(id: string, props: P & MenuActionProperties, invoke: () => void): this;

  /** Add a nested action group. */
  group<P extends {} = {}>(id: string, props: P & MenuItemGroupProperties, cb: ActionGroupBuilderFn): this;

  /** Merge pre-built nodes and edges, or build a subgraph via callback scoped to the current group. Falsy values are ignored. */
  subgraph(subgraphOrCb: ActionGraphProps | ActionGroupBuilderFn | false | null | undefined): this;

  /** Add a separator. */
  separator(variant?: 'gap' | 'line'): this;
}

/** Top-level builder that creates the root group and produces the final action graph. */
export interface MenuBuilder extends ActionGroupBuilder {
  /** Set properties on the root menu group. May only be called once. */
  root(props: MenuItemGroupProperties): this;

  /** Return the assembled action graph. */
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

  group<P extends {} = {}>(id: string, props: P & MenuItemGroupProperties, cb: ActionGroupBuilderFn): this {
    this._data.nodes.push(createMenuItemGroup(id, props));
    this._data.edges.push({ source: this._rootId, target: id, relation: 'child' });
    cb(new MenuBuilderImpl(this._data, id));
    return this;
  }

  subgraph(subgraphOrCb: ActionGraphProps | ActionGroupBuilderFn | false | null | undefined): this {
    if (!subgraphOrCb) {
      return this;
    }
    if (typeof subgraphOrCb === 'function') {
      subgraphOrCb(new MenuBuilderImpl(this._data, this._rootId));
    } else {
      this._data.nodes.push(...subgraphOrCb.nodes);
      this._data.edges.push(...subgraphOrCb.edges);
    }
    return this;
  }

  separator(variant: 'gap' | 'line' = 'gap'): this {
    const id = `separator-${++this._separatorCount}`;
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
