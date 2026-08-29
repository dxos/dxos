//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The layout template model: a plain, serializable tree that names kinds from
// `react-ui/docs/ONTOLOGY.md` and nothing else.
//
// This file must never import a UI framework — that constraint is the experiment (ONTOLOGY R-6,
// R-13). If it ever needs React, Solid, or the DOM, the model has leaked and the result is
// negative.
//

/** Kind tags. Deliberately a subset of the ontology's 17 — see the spike's scope. */
export type Tag = 'container' | 'layout' | 'display' | 'control' | 'collection' | 'command' | 'form' | 'combobox';

export const TAGS: readonly Tag[] = [
  'container',
  'layout',
  'display',
  'control',
  'collection',
  'command',
  'form',
  'combobox',
];

/**
 * A read binding. `path` is resolved against the template's state object; `item` against the
 * current element inside a `collection`, which is the only scope a template introduces.
 */
export type Binding = { readonly from: 'state' | 'item'; readonly path: readonly string[] };

/**
 * One node. `props` are static aspects (closed enums, validated); `data` are read bindings;
 * `events` map an emitted event name to an operation key — the single outbound edge (R-3).
 */
export type Node = {
  readonly tag: Tag;
  readonly props?: Readonly<Record<string, string | number | boolean>>;
  readonly data?: Readonly<Record<string, Binding>>;
  readonly events?: Readonly<Record<string, string>>;
  readonly children?: readonly Node[];
};

/**
 * A template, parameterized by the type of the state it binds to (R-1). The parameter is phantom —
 * it exists to make `render(template, state)` reject a mismatched state at compile time, and to
 * type the path builder that produced the bindings.
 */
export type Template<State> = {
  readonly root: Node;
  readonly _state?: (state: State) => void;
};

//
// Typed path builder.
//
// `select<State>()` yields a proxy that records property access, so `select<S>().title` is both a
// real path and a compile error when `title` is not on `S`. This is what a generic template
// parameter buys that a string attribute cannot.
//

const PATH = Symbol.for('dxos.ui-template.path');

export type Path<T> = { readonly [PATH]: readonly string[] } & (T extends object
  ? { readonly [K in keyof T]-?: Path<NonNullable<T[K]>> }
  : unknown);

const makePath = (path: readonly string[]): any =>
  new Proxy(
    { [PATH]: path },
    {
      get: (target: any, key) => (key === PATH ? path : makePath([...path, String(key)])),
    },
  );

/** Root of a typed path into the template's state. */
export const select = <State>(): Path<State> => makePath([]);

/** Root of a typed path into the current `collection` item. */
export const item = <Item>(): Path<Item> => makePath([]);

const pathOf = (value: unknown): readonly string[] => (value as any)[PATH];

/** Bind a node prop to a path on the state object. */
export const fromState = (path: Path<any>): Binding => ({ from: 'state', path: pathOf(path) });

/** Bind a node prop to a path on the current collection item. */
export const fromItem = (path: Path<any>): Binding => ({ from: 'item', path: pathOf(path) });

//
// Resolution.
//

export type Scope = { readonly state: unknown; readonly item?: unknown };

/** Walk a binding against a scope. Returns `undefined` for a path that does not resolve. */
export const resolve = (binding: Binding, scope: Scope): unknown => {
  let value: any = binding.from === 'item' ? scope.item : scope.state;
  for (const key of binding.path) {
    if (value == null) {
      return undefined;
    }
    value = value[key];
  }
  return value;
};

//
// Validation.
//
// A tag outside the set is an error, never a silent no-op (R-8). The spike checks tags and event
// values; a real implementation would check props against each kind's closed aspect set.
//

export class TemplateValidationError extends Error {
  readonly _tag = 'TemplateValidationError';
  constructor(
    message: string,
    readonly at: string,
  ) {
    super(`${message} (at ${at})`);
  }
}

export const validate = (node: Node, at = 'root'): void => {
  if (!TAGS.includes(node.tag)) {
    throw new TemplateValidationError(`unknown tag '${node.tag}'`, at);
  }
  for (const [event, operation] of Object.entries(node.events ?? {})) {
    if (!operation.includes('.')) {
      throw new TemplateValidationError(`event '${event}' must name an operation key`, at);
    }
  }
  node.children?.forEach((child, index) => validate(child, `${at} > ${child.tag}[${index}]`));
};
