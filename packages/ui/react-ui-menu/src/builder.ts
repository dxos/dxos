//
// Copyright 2025 DXOS.org
//

import { type ReactNode } from 'react';

import { invariant } from '@dxos/invariant';
import type { DropdownMenuItemGroupProperties, MenuActionProperties, MenuItemGroupProperties } from '@dxos/ui-types';

import { translationKey } from '#translations';

import type { ActionGraphProps } from './hooks/index.ts';
import { MenuSeparatorType } from './types.ts';
import { createMenuAction, createMenuItemGroup } from './util.ts';

/** Default trigger for toolbar overflow (⋮) dropdown menus. */
const overflowMenuProperties = {
  label: ['toolbar-overflow.menu', { ns: translationKey }],
  icon: 'ph--dots-three-vertical--regular',
  iconOnly: true,
  caretDown: false,
  variant: 'dropdownMenu',
} as const satisfies DropdownMenuItemGroupProperties;

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

  /** Add a switch action rendered as a labeled Field.Switch. */
  switch(id: string, props: Omit<MenuActionProperties, 'variant'> & { checked: boolean }, invoke: () => void): this;

  /** Add a control the caller renders itself (a picker, a field); it stays in the toolbar and never collapses. */
  custom(id: string, props: Omit<MenuActionProperties, 'variant' | 'render'>, render: () => ReactNode): this;

  /** Add a plain label (e.g. a panel's name) that takes the toolbar's free space. */
  text(id: string, props: Omit<MenuActionProperties, 'variant' | 'render'>): this;

  /** Add a nested action group. */
  group(id: string, props: MenuItemGroupProperties, cb: ActionGroupBuilderFn): this;

  /** Merge pre-built nodes and edges, or build a subgraph via callback scoped to the current group. Falsy values are ignored. */
  subgraph(subgraphOrCb: ActionGraphProps | ActionGroupBuilderFn | false | null | undefined): this;

  /** Add a separator. */
  separator(variant?: 'gap' | 'line'): this;
}

/** Top-level builder that creates the root group and produces the final action graph. */
export interface MenuBuilder extends ActionGroupBuilder {
  /**
   * Set properties on the root menu group. May only be called once.
   */
  root(props: MenuItemGroupProperties): this;

  /**
   * Add a root-level toolbar overflow dropdown (⋮) with built-in trigger styling.
   */
  menu(id: string, cb: ActionGroupBuilderFn, testId?: string): this;

  /**
   * Return the assembled action graph.
   */
  build(): ActionGraphProps;
}

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

  build(): ActionGraphProps {
    return this._data;
  }

  action<P extends {} = {}>(id: string, props: P & MenuActionProperties, invoke: () => void): this {
    this._data.nodes.push(createMenuAction(id, invoke, props));
    this._data.edges.push({ source: this._rootId, target: id, relation: 'child' });
    return this;
  }

  switch(id: string, props: Omit<MenuActionProperties, 'variant'> & { checked: boolean }, invoke: () => void): this {
    return this.action(id, { ...props, variant: 'switch' }, invoke);
  }

  custom(id: string, props: Omit<MenuActionProperties, 'variant' | 'render'>, render: () => ReactNode): this {
    return this.action(id, { ...props, variant: 'custom', render }, () => {});
  }

  text(id: string, props: Omit<MenuActionProperties, 'variant' | 'render'>): this {
    return this.action(id, { ...props, variant: 'text' }, () => {});
  }

  group(id: string, props: MenuItemGroupProperties, cb: ActionGroupBuilderFn): this {
    this._data.nodes.push(createMenuItemGroup(id, props));
    this._data.edges.push({ source: this._rootId, target: id, relation: 'child' });
    cb(new MenuBuilderImpl(this._data, id));
    return this;
  }

  menu(id: string, cb: ActionGroupBuilderFn, testId?: string): this {
    return this.group(id, testId === undefined ? overflowMenuProperties : { ...overflowMenuProperties, testId }, cb);
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
    // Numbered across the whole graph: a nested group or subgraph builds into the same nodes, so a count of its own
    // would reuse an id and the later separator would replace the earlier one.
    const id = `separator-${this._data.nodes.filter((node) => node.type === MenuSeparatorType).length + 1}`;
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

/** Id of the overflow menu (⋮) every toolbar ends with; contributors add to it with {@link MenuBuilder.extend}. */
export const TOOLBAR_OVERFLOW_ID = 'toolbar-overflow';

/** The overflow group a toolbar uses when its owner declares none, so contributors can still add to it. */
export const defaultOverflowGroup = createMenuItemGroup(TOOLBAR_OVERFLOW_ID, overflowMenuProperties);

export const MenuBuilder = Object.freeze({
  make: (): MenuBuilder => new MenuBuilderImpl({ nodes: [], edges: [] }, 'root'),

  /**
   * Builds items into a named group another component declared, so a plugin extends a toolbar or menu it does not own.
   * The result is merged into the owner's graph (e.g. with `subgraph`); its edges hang off `groupId`.
   */
  extend: (groupId: string, cb: ActionGroupBuilderFn): ActionGraphProps => {
    const data: ActionGraphProps = { nodes: [], edges: [] };
    cb(new MenuBuilderImpl(data, groupId));
    return data;
  },
});
