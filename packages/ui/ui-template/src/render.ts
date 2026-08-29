//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The renderer contract. Framework-free by construction: a renderer is a map from kind tag
// to a function producing whatever that framework's element type is, so `Output` is the only place
// React or Solid appears.
//

import { type Binding, type Node, type Scope, type Tag, resolve } from './model';

/** What a renderer receives for one node. Bindings arrive resolved — a renderer never walks state. */
export type RenderProps<Output> = {
  readonly node: Node;
  /**
   * Stable identity for this node within the tree (`'0.1'`), extended with the item index inside a
   * collection. Every framework needs one to reconcile a list; deriving it here keeps that concern
   * out of each renderer.
   */
  readonly path: string;
  readonly props: Readonly<Record<string, string | number | boolean>>;
  /** Resolved `data-*` / `item-*` values, by prop name. */
  readonly data: Readonly<Record<string, unknown>>;
  /** Event name to a handler that dispatches the bound operation key. */
  readonly handlers: Readonly<Record<string, () => void>>;
  readonly children: readonly Output[];
  /** The scope this node renders in; needed only by kinds that introduce one (`collection`). */
  readonly scope: Scope;
  /**
   * Render this node's children under a narrowed scope. `suffix` distinguishes repeats, so a
   * collection's items produce distinct paths.
   */
  readonly renderChildren: (scope: Scope, suffix?: string) => readonly Output[];
};

export type Renderer<Output> = {
  readonly [K in Tag]: (props: RenderProps<Output>) => Output;
};

/** Invoked for every `on-*` binding. The template never holds a callback — only an operation key. */
export type Dispatch = (operation: string, payload: { scope: Scope; node: Node }) => void;

export type RenderOptions = {
  readonly dispatch?: Dispatch;
};

const resolveData = (data: Readonly<Record<string, Binding>> | undefined, scope: Scope) =>
  Object.fromEntries(Object.entries(data ?? {}).map(([key, binding]) => [key, resolve(binding, scope)]));

/**
 * Walk the model and hand each node to the renderer.
 *
 * `collection` is the only kind that introduces a scope: it renders its children once per resolved
 * item. Every other kind passes its scope through unchanged, which is what keeps the model free of
 * an expression language — there is nothing to evaluate, only paths to walk.
 */
export const render = <Output>(
  node: Node,
  scope: Scope,
  renderer: Renderer<Output>,
  options: RenderOptions = {},
  path = '0',
): Output => {
  const data = resolveData(node.data, scope);

  const handlers = Object.fromEntries(
    Object.entries(node.events ?? {}).map(([event, operation]) => [
      event,
      () => options.dispatch?.(operation, { scope, node }),
    ]),
  );

  const renderChildren = (childScope: Scope, suffix = ''): readonly Output[] =>
    (node.children ?? []).map((child, index) =>
      render(child, childScope, renderer, options, `${path}${suffix}.${index}`),
    );

  return renderer[node.tag]({
    node,
    path,
    props: node.props ?? {},
    data,
    handlers,
    scope,
    renderChildren,
    // A collection's children belong to its items, so the default pass is empty and the renderer
    // calls `renderChildren` once per item instead.
    children: node.tag === 'collection' ? [] : renderChildren(scope),
  });
};
