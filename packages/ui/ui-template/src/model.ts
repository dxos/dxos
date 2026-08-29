//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The layout template model: a plain, serializable tree that names kinds from
// `docs/ONTOLOGY.md` and nothing else.
//
// This file must never import a UI framework — that constraint is the experiment (ONTOLOGY R-6,
// R-13). If it ever needs React, Solid, or the DOM, the model has leaked and the result is
// negative.
//

/** Kind tags. Deliberately a subset of the ontology's 17 — see the spike's scope. */
export type Tag =
  | 'container'
  | 'layout'
  | 'display'
  | 'control'
  | 'collection'
  | 'command'
  | 'form'
  | 'combobox'
  | 'tabs'
  | 'tab'
  | 'switch'
  | 'match'
  | 'show'
  | 'fallback'
  | 'let';

export const TAGS: readonly Tag[] = [
  'container',
  'layout',
  'display',
  'control',
  'collection',
  'command',
  'form',
  'combobox',
  'tabs',
  'tab',
  'switch',
  'match',
  'show',
  'fallback',
  'let',
];

/**
 * A read binding. `path` is resolved lexically: the first segment is looked up through the
 * enclosing scopes (innermost first) before falling back to the root state object. `item` binds
 * against the current element inside a `collection`.
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

/**
 * One lexical scope, opened by an element that declares `id`. Its `let` children declare the
 * machine-backed slots, published at `ui.<path>.<name>`. `values` holds the slots' current
 * values, resolved from published state.
 */
export type ScopeFrame = {
  readonly id: string;
  /** Publication path: the enclosing scope ids plus this one. */
  readonly path: readonly string[];
  /** Machine-backed `let` names — the slots operations may write. */
  readonly slots: readonly string[];
  readonly values: Readonly<Record<string, unknown>>;
};

export type Scope = {
  readonly state: unknown;
  readonly item?: unknown;
  /** Enclosing scopes, outermost first. */
  readonly frames?: readonly ScopeFrame[];
};

/** Walk a binding against a scope. Returns `undefined` for a path that does not resolve. */
export const resolve = (binding: Binding, scope: Scope): unknown => {
  let value: any;
  let rest: readonly string[] = binding.path;
  if (binding.from === 'item') {
    value = scope.item;
  } else {
    const head = binding.path[0];
    const frames = scope.frames ?? [];
    // Innermost scope wins; an undeclared name falls through to the root state object, so
    // app-level context (`organizations`, `title`) needs no declaration.
    const frame = head === undefined ? undefined : frames.findLast((candidate) => head in candidate.values);
    if (frame && head !== undefined) {
      value = frame.values[head];
      rest = binding.path.slice(1);
    } else {
      value = scope.state;
    }
  }
  for (const key of rest) {
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
// A tag outside the set is an error, never a silent no-op (R-8). The spike checks tags, event
// values, and the structural rules of the conditional/scope constructs; a real implementation
// would check props against each kind's closed aspect set.
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

/**
 * Recursively validate a node tree: every tag must be in the closed set, every event value must
 * name an operation key, and the structural constructs must be well-formed — `let` declares
 * `name` plus `machine` and lives under an element with `id`; `show`
 * requires `when`; `switch` requires `on` and only `match` children. Throws
 * {@link TemplateValidationError} with the offending node's path.
 */
export const validate = (node: Node, at = 'root'): void => {
  if (!TAGS.includes(node.tag)) {
    throw new TemplateValidationError(`unknown tag '${node.tag}'`, at);
  }
  for (const [event, operation] of Object.entries(node.events ?? {})) {
    if (!operation.includes('.')) {
      throw new TemplateValidationError(`event '${event}' must name an operation key`, at);
    }
  }

  switch (node.tag) {
    case 'let': {
      if (typeof node.props?.name !== 'string') {
        throw new TemplateValidationError(`'let' requires a name`, at);
      }
      if (typeof node.props?.machine !== 'string') {
        throw new TemplateValidationError(`'let' requires a machine`, at);
      }
      break;
    }
    case 'show': {
      if (!node.data?.when) {
        throw new TemplateValidationError(`'show' requires a when binding`, at);
      }
      break;
    }
    case 'switch': {
      if (!node.data?.on) {
        throw new TemplateValidationError(`'switch' requires an on binding`, at);
      }
      if (node.children?.some((child) => child.tag !== 'match')) {
        throw new TemplateValidationError(`'switch' children must be 'match'`, at);
      }
      break;
    }
    case 'match': {
      if (node.props?.value === undefined) {
        throw new TemplateValidationError(`'match' requires a value`, at);
      }
      break;
    }
  }

  // Parent-side rules: variables need a scope to live in; a lone fallback needs its show.
  if (node.children?.some((child) => child.tag === 'let') && typeof node.props?.id !== 'string') {
    throw new TemplateValidationError(`'let' requires an enclosing element with an id`, at);
  }
  if (node.tag !== 'show' && node.children?.some((child) => child.tag === 'fallback')) {
    throw new TemplateValidationError(`'fallback' is only valid inside 'show'`, at);
  }

  node.children?.forEach((child, index) => validate(child, `${at} > ${child.tag}[${index}]`));
};
