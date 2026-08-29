//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The renderer contract. Framework-free by construction: a renderer is a map from kind tag
// to a function producing whatever that framework's element type is, so `Output` is the only place
// React or Solid appears.
//

import { type Binding, type Node, type Scope, type Tag, resolve } from './model';

const asText = (value: unknown): string => (value == null ? '' : String(value));

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
  /** Event name to a handler that dispatches the bound operation key with an optional payload. */
  readonly handlers: Readonly<Record<string, (payload?: unknown) => void>>;
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
export type Dispatch = (operation: string, context: { scope: Scope; node: Node; payload?: unknown }) => void;

export type RenderOptions = {
  readonly dispatch?: Dispatch;
};

const resolveData = (data: Readonly<Record<string, Binding>> | undefined, scope: Scope) =>
  Object.fromEntries(Object.entries(data ?? {}).map(([key, binding]) => [key, resolve(binding, scope)]));

/**
 * `absent="omit"`: the node is omitted while every one of its `data-*` bindings resolves to
 * undefined (ONTOLOGY R-2). Omission is driven by binding resolution — never by an expression —
 * so a detail pane disappears when nothing is selected without the grammar growing conditionals.
 */
const isAbsent = (node: Node, data: Readonly<Record<string, unknown>>): boolean =>
  node.props?.absent === 'omit' &&
  Object.keys(node.data ?? {}).length > 0 &&
  Object.values(data).every((value) => value === undefined);

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
): Output | null => {
  const data = resolveData(node.data, scope);
  if (isAbsent(node, data)) {
    return null;
  }

  const handlers = Object.fromEntries(
    Object.entries(node.events ?? {}).map(([event, operation]) => [
      event,
      (payload?: unknown) => options.dispatch?.(operation, { scope, node, payload }),
    ]),
  );

  // `switch` is structural, expression-free conditionality: it renders the `case` child whose
  // `value` prop equals its resolved `data-value` binding — equality against published state, so
  // tabs (or any operation) drive which branch exists. The other cases are not hidden; they are
  // never rendered.
  const matchedCase =
    node.tag === 'switch'
      ? (node.children ?? []).find((child) => child.tag === 'case' && child.props?.value === data.value)
      : undefined;

  const renderChildren = (childScope: Scope, suffix = ''): readonly Output[] =>
    (node.children ?? [])
      .map((child, index) => render(child, childScope, renderer, options, `${path}${suffix}.${index}`))
      .filter((child): child is Output => child !== null);

  return renderer[node.tag]({
    node,
    path,
    props: node.props ?? {},
    data,
    handlers,
    scope,
    renderChildren,
    // A collection's children belong to its items (the renderer calls `renderChildren` per item);
    // a switch renders only its matched case's children.
    children:
      node.tag === 'collection'
        ? []
        : node.tag === 'switch'
          ? (matchedCase?.children ?? [])
              .map((child, index) => render(child, scope, renderer, options, `${path}[${asText(data.value)}].${index}`))
              .filter((child): child is Output => child !== null)
          : renderChildren(scope),
  });
};
