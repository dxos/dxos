//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The renderer contract. Framework-free by construction: a renderer is a map from kind tag
// to a function producing whatever that framework's element type is, so `Output` is the only place
// React or Solid appears.
//

import {
  type Binding,
  BindingResolutionError,
  type ModuleView,
  type Node,
  type Scope,
  type ScopeFrame,
  type Tag,
  resolve,
  useAliases,
  varNames,
} from './model';

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
  /**
   * Resolved `data-*` / `item-*` values, by prop name.
   */
  readonly data: Readonly<Record<string, unknown>>;
  /**
   * Event name to a handler that dispatches the bound operation key with an optional payload.
   */
  readonly handlers: Readonly<Record<string, (payload?: unknown) => void>>;
  /**
   * The scope this node renders in; needed only by kinds that introduce one (`collection`).
   */
  readonly scope: Scope;
  readonly children: readonly Output[];
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
export type Dispatch = (
  operation: string,
  context: {
    scope: Scope;
    node: Node;
    payload?: unknown;
  },
) => void;

/**
 * What a renderer factory needs from the registry, independent of the output framework —
 * `schema=` resolution is a property of the grammar, not of React.
 */
export type CreateRendererOptions<Schema = unknown> = {
  /** The registry's schemas by URI key; `form` resolves `schema=` against this. */
  readonly schemas: Readonly<Record<string, Schema>>;
};

export type RenderOptions<Output = unknown> = {
  readonly dispatch?: Dispatch;
  /**
   * Renders a node whose bindings failed to resolve at render time. Without one the
   * {@link BindingResolutionError} propagates — headless callers assert on it; a UI renderer
   * supplies an inline error element (R-8: visible, never silent).
   */
  readonly onError?: (error: Error, path: string) => Output;
};

const resolveData = (data: Readonly<Record<string, Binding>> | undefined, scope: Scope) =>
  Object.fromEntries(Object.entries(data ?? {}).map(([key, binding]) => [key, resolve(binding, scope)]));

/** `show` presence: anything except undefined/null/false renders the children. */
/** Presence: the shared semantics of `show when=` and `control enabled=`. */
export const present = (value: unknown): boolean => value !== undefined && value !== null && value !== false;

/** Read the published slot value for a frame's `let` at `<path>.<name>` off the scope's ui tree. */
const readSlot = (ui: unknown, path: readonly string[]): unknown => {
  let value: unknown = ui;
  for (const key of path) {
    if (value == null || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value;
};

/** Read a `let from="alias.capability"` value off the scope's module aliases. */
const readCapability = (scope: Scope, from: string, path: readonly string[]): unknown => {
  const [alias, capability] = from.split('.');
  if (!scope.aliases || !(alias in scope.aliases)) {
    throw new BindingResolutionError(`'let' from names undeclared alias '${alias}'`, path);
  }
  const view = scope.aliases[alias];
  if (!view) {
    throw new BindingResolutionError(`unknown module for alias '${alias}'`, path);
  }
  if (!(capability in view.capabilities)) {
    throw new BindingResolutionError(`unknown capability '${alias}.${capability}' on module '${view.key}'`, path);
  }
  return view.capabilities[capability];
};

/**
 * An element declaring `id` opens a lexical scope: its direct `let` children are the slots.
 * Rung 1/2 slots read published state at `ui.<enclosing ids>.<id>.<name>` and stay writable;
 * a rung-3 `from=` slot mirrors the module capability it binds — readable in the subtree but
 * never writable here (only the owning module's operations write it).
 */
const openFrame = (node: Node, scope: Scope): ScopeFrame => {
  const id = String(node.props?.id);
  const outer = scope.frames?.[scope.frames.length - 1];
  const path = [...(outer?.path ?? []), id];
  const slots: string[] = [];
  const values: Record<string, unknown> = {};
  for (const child of node.children ?? []) {
    if (child.tag === 'let' && typeof child.props?.name === 'string') {
      const name = child.props.name;
      if (typeof child.props.from === 'string') {
        values[name] = readCapability(scope, child.props.from, [...path, name]);
        continue;
      }
      slots.push(name);
      values[name] = readSlot(scope.ui, [...path, name]);
    }
  }
  return { id, path, slots, values };
};

/**
 * Open the root's declaration ring. `vars` narrows to the `var` signature: every declared input
 * resolves (to the supplied value or `undefined`), and an undeclared key never resolves — the
 * signature, not the host, closes the namespace. `use` aliases map onto the host-supplied module
 * views by module key; a declared alias whose module is absent stays present (as `undefined`) so
 * resolving through it errors visibly instead of falling silent.
 */
const openRoot = (root: Node, scope: Scope): Scope => {
  const vars: Record<string, unknown> = {};
  for (const name of varNames(root)) {
    vars[name] = scope.vars?.[name];
  }
  const aliases: Record<string, ModuleView | undefined> = {};
  for (const [alias, moduleKey] of Object.entries(useAliases(root))) {
    aliases[alias] = scope.modules?.[moduleKey];
  }
  return { ...scope, vars, aliases };
};

/**
 * Walk the model and hand each node to the renderer.
 *
 * `collection` introduces an item scope (children render once per resolved item); an element with
 * `id` opens a lexical scope frame over its subtree. `show`/`switch` are structural, expression-
 * free conditionality: which children exist is a function of one resolved binding. There is no
 * expression language — only paths to walk.
 */
export const render = <Output>(
  node: Node,
  scope: Scope,
  renderer: Renderer<Output>,
  options: RenderOptions<Output> = {},
  path = '0',
): Output | null => renderNode(node, openRoot(node, scope), renderer, options, path);

const renderNode = <Output>(
  node: Node,
  scope: Scope,
  renderer: Renderer<Output>,
  options: RenderOptions<Output>,
  path: string,
): Output | null => {
  let data: Readonly<Record<string, unknown>>;
  try {
    // The frame is pushed before this node's own bindings resolve, so an element binds against
    // its own `let`s; opening it can itself fail on a dangling `from=` capability.
    if (typeof node.props?.id === 'string') {
      scope = { ...scope, frames: [...(scope.frames ?? []), openFrame(node, scope)] };
    }
    data = resolveData(node.data, scope);
  } catch (err) {
    // R-8: a binding that fails to resolve renders a visible error in place of the node.
    if (err instanceof BindingResolutionError && options.onError) {
      return options.onError(err, path);
    }
    throw err;
  }

  const handlers = Object.fromEntries(
    Object.entries(node.events ?? {}).map(([event, operation]) => [
      event,
      (payload?: unknown) => options.dispatch?.(operation, { scope, node, payload }),
    ]),
  );

  const renderSubset = (nodes: readonly Node[], suffix: string): readonly Output[] =>
    nodes
      .map((child, index) => renderNode(child, scope, renderer, options, `${path}${suffix}.${index}`))
      .filter((child): child is Output => child !== null);

  const renderChildren = (childScope: Scope, suffix = ''): readonly Output[] =>
    (node.children ?? [])
      .map((child, index) => renderNode(child, childScope, renderer, options, `${path}${suffix}.${index}`))
      .filter((child): child is Output => child !== null);

  // Structural conditionality: `show` renders its children while `when` is present, otherwise the
  // children of its `fallback`; `switch` renders the children of the `match` whose value equals
  // the resolved `on`. Unmatched branches are not hidden — they are never rendered.
  const children = (): readonly Output[] => {
    switch (node.tag) {
      case 'collection':
        // A collection's children belong to its items; the renderer calls `renderChildren` per item.
        return [];
      case 'show': {
        if (present(data.when)) {
          return renderSubset(
            (node.children ?? []).filter((child) => child.tag !== 'fallback'),
            '[show]',
          );
        }
        const fallback = (node.children ?? []).find((child) => child.tag === 'fallback');
        return renderSubset(fallback?.children ?? [], '[fallback]');
      }
      case 'switch': {
        const matched = (node.children ?? []).find((child) => child.tag === 'match' && child.props?.value === data.on);
        return renderSubset(matched?.children ?? [], `[${asText(data.on)}]`);
      }
      default:
        return renderChildren(scope);
    }
  };

  return renderer[node.tag]({
    node,
    path,
    props: node.props ?? {},
    data,
    handlers,
    scope,
    renderChildren,
    children: children(),
  });
};
