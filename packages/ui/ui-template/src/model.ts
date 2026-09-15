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
  | 'let'
  | 'var'
  | 'use';

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
  'var',
  'use',
];

/**
 * A read binding. `path` is resolved lexically against declared names only: the first segment
 * must be a `let` slot in an enclosing scope, a root `var` input, or a `use` alias — there is no
 * fall-through to an ambient context object. `item` binds against the current element inside a
 * `collection`.
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

const makePath = <T>(path: readonly string[]): Path<T> =>
  new Proxy(
    { [PATH]: path },
    {
      get: (target: { readonly [PATH]: readonly string[] }, key) =>
        key === PATH ? path : makePath<unknown>([...path, String(key)]),
    },
  ) as Path<T>;

/** Root of a typed path into the template's state. */
export const select = <State>(): Path<State> => makePath<State>([]);

/** Root of a typed path into the current `collection` item. */
export const item = <Item>(): Path<Item> => makePath<Item>([]);

const pathOf = (value: unknown): readonly string[] => (value as { readonly [PATH]: readonly string[] })[PATH];

/** Bind a node prop to a path on the state object. */
export const fromState = <T>(path: Path<T>): Binding => ({ from: 'state', path: pathOf(path) });

/** Bind a node prop to a path on the current collection item. */
export const fromItem = <T>(path: Path<T>): Binding => ({ from: 'item', path: pathOf(path) });

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

/**
 * The current values of one module's contract, materialized for binding. Column 2 (operations)
 * has no read surface — events dispatch it by key. Every export name is present as a key, so a
 * missing export is distinguishable from a legitimately-absent value.
 */
export type ModuleView = {
  readonly key: string;
  /** Column 1: reactive readonly state — export name → current value. */
  readonly state: Readonly<Record<string, unknown>>;
  /** Column 3: capabilities — instance name → the instance's current state (`let from=` binds it). */
  readonly capabilities: Readonly<Record<string, unknown>>;
  /**
   * Column 3, live: capability name → the mounted instance's connect surface (event senders).
   * Reads never come from here — the instance's state flows back through published slots.
   */
  readonly apis?: Readonly<Record<string, unknown>>;
};

export type Scope = {
  /** Published UI state: the tree `let` slot values are read from at `<idPath>.<name>`. */
  readonly ui?: Readonly<Record<string, unknown>>;
  readonly item?: unknown;
  /**
   * Host-supplied values for the root's `var` signature. Keys are the declared input names —
   * a declared-but-absent optional input resolves to `undefined`; an undeclared key never
   * resolves at all (render narrows the record to the signature).
   */
  readonly vars?: Readonly<Record<string, unknown>>;
  /** Host-supplied module views by module key; render maps the root's `use` aliases onto them. */
  readonly modules?: Readonly<Record<string, ModuleView>>;
  /**
   * `use` aliases (built by render from the root's `use` children). A key mapped to `undefined`
   * is a declared alias whose module is missing — resolving through it is an inline error, not
   * silence.
   */
  readonly aliases?: Readonly<Record<string, ModuleView | undefined>>;
  /** Enclosing scopes, outermost first. */
  readonly frames?: readonly ScopeFrame[];
};

/**
 * A binding that reached an undeclared or unresolvable name at render time. Statically-knowable
 * failures are caught at parse ({@link checkBindings}); this class covers the rest — and a
 * renderer surfaces it inline rather than rendering as though the data were absent (R-8).
 */
export class BindingResolutionError extends Error {
  readonly _tag = 'BindingResolutionError';
  constructor(
    message: string,
    readonly path: readonly string[],
  ) {
    super(`${message} (binding '${path.join('.')}')`);
  }
}

/**
 * Walk a binding against a scope. The first segment of a state binding must resolve to a declared
 * name — a `let` slot in an enclosing frame; anything else throws {@link BindingResolutionError}
 * (no fall-through to an ambient context object). A path that walks off a resolved value yields
 * `undefined` — legitimate absence, handled structurally by `show` (R-2).
 */
export const resolve = (binding: Binding, scope: Scope): unknown => {
  let value: any;
  let rest: readonly string[] = binding.path;
  if (binding.from === 'item') {
    value = scope.item;
  } else {
    const head = binding.path[0];
    if (head === undefined) {
      throw new BindingResolutionError('a state binding requires a path', binding.path);
    }
    // Innermost scope wins; the root `var` signature and `use` aliases are the outermost ring.
    const frame = (scope.frames ?? []).findLast((candidate) => head in candidate.values);
    if (frame) {
      value = frame.values[head];
      rest = binding.path.slice(1);
    } else if (scope.vars && head in scope.vars) {
      value = scope.vars[head];
      rest = binding.path.slice(1);
    } else if (scope.aliases && head in scope.aliases) {
      const view = scope.aliases[head];
      if (!view) {
        throw new BindingResolutionError(`unknown module for alias '${head}'`, binding.path);
      }
      const name = binding.path[1];
      if (name === undefined) {
        throw new BindingResolutionError(`binding through '${head}' requires an export name`, binding.path);
      }
      // Plain data paths read column 1 only; capabilities are reached with `let from=`.
      if (!(name in view.state)) {
        throw new BindingResolutionError(
          `unknown state export '${head}.${name}' on module '${view.key}'`,
          binding.path,
        );
      }
      value = view.state[name];
      rest = binding.path.slice(2);
    } else {
      throw new BindingResolutionError(`unresolved name '${head}'`, binding.path);
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
      // The ladder: rung 1 is a literal initial value, rung 2 a machine-backed slot, rung 3 a
      // module-provided capability — the backing escalates in place, so exactly one must be named.
      const backings = ['initial', 'machine', 'from'].filter((key) => node.props && key in node.props);
      if (backings.length !== 1) {
        throw new TemplateValidationError(`'let' requires exactly one of initial, machine, or from`, at);
      }
      if (node.props && 'from' in node.props) {
        const from = node.props.from;
        if (typeof from !== 'string' || from.split('.').length !== 2 || from.split('.').some((part) => !part)) {
          throw new TemplateValidationError(`'let' from must name '<alias>.<capability>'`, at);
        }
      }
      break;
    }
    case 'var': {
      // The template signature: a typed, host-supplied input (registry schema key), with
      // cardinality/optionality explicit — inputs are required or optional, never defaulted.
      if (typeof node.props?.name !== 'string') {
        throw new TemplateValidationError(`'var' requires a name`, at);
      }
      if (typeof node.props?.type !== 'string') {
        throw new TemplateValidationError(`'var' requires a type`, at);
      }
      for (const flag of ['many', 'optional']) {
        if (node.props && flag in node.props && typeof node.props[flag] !== 'boolean') {
          throw new TemplateValidationError(`'var' ${flag} must be a boolean`, at);
        }
      }
      break;
    }
    case 'use': {
      // The module import: a registry module key bound to a local alias — bindings then read
      // `<alias>.<export>`, and nothing resolves without the alias.
      if (typeof node.props?.module !== 'string') {
        throw new TemplateValidationError(`'use' requires a module`, at);
      }
      if (typeof node.props?.as !== 'string') {
        throw new TemplateValidationError(`'use' requires an alias (as)`, at);
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

/** Slot names an element's direct `let` children declare. */
const letNames = (node: Node): string[] =>
  (node.children ?? []).flatMap((child) =>
    child.tag === 'let' && typeof child.props?.name === 'string' ? [child.props.name] : [],
  );

/** Input names a root's direct `var` children declare — the template's signature. */
export const varNames = (root: Node): string[] =>
  (root.children ?? []).flatMap((child) =>
    child.tag === 'var' && typeof child.props?.name === 'string' ? [child.props.name] : [],
  );

/** Module aliases a root's direct `use` children declare, alias → module key. */
export const useAliases = (root: Node): Record<string, string> => {
  const aliases: Record<string, string> = {};
  for (const child of root.children ?? []) {
    if (child.tag === 'use' && typeof child.props?.as === 'string' && typeof child.props?.module === 'string') {
      aliases[child.props.as] = child.props.module;
    }
  }
  return aliases;
};

/**
 * Full-tree closed-resolution check: every state binding's first path segment must be a declared
 * name — a `let` slot in an enclosing scope, a root `var` input, or a root `use` alias.
 * Declaration and use are both in the document, so an undeclared name is a parse-time error,
 * never a silent `undefined` at render (R-8). What a module actually exports is checked later,
 * against the registry (registration/mount).
 */
export const checkBindings = (root: Node): void => {
  const aliases = new Set(Object.keys(useAliases(root)));
  const rootDeclarations = new Set<string>(aliases);
  // The alias record collapses duplicates, so a count mismatch means two `use` claimed one alias.
  if ((root.children ?? []).filter((child) => child.tag === 'use').length !== aliases.size) {
    throw new TemplateValidationError(`duplicate use alias`, 'root');
  }
  for (const name of varNames(root)) {
    if (rootDeclarations.has(name)) {
      throw new TemplateValidationError(`duplicate declaration '${name}'`, 'root');
    }
    rootDeclarations.add(name);
  }

  const check = (node: Node, declared: ReadonlySet<string>, at: string): void => {
    let scope = declared;
    if (typeof node.props?.id === 'string') {
      const names = letNames(node);
      if (names.length) {
        scope = new Set([...declared, ...names]);
      }
    }
    for (const [key, binding] of Object.entries(node.data ?? {})) {
      if (binding.from !== 'state') {
        continue;
      }
      const head = binding.path[0];
      if (head === undefined) {
        throw new TemplateValidationError(`binding '${key}' requires a path`, at);
      }
      if (!scope.has(head)) {
        throw new TemplateValidationError(`binding '${key}' names undeclared '${head}'`, at);
      }
      if (aliases.has(head) && binding.path.length < 2) {
        throw new TemplateValidationError(`binding '${key}' through '${head}' requires an export name`, at);
      }
    }
    // A rung-3 let binds a module capability: its alias must be a root `use` declaration.
    if (node.tag === 'let' && typeof node.props?.from === 'string') {
      const [alias] = node.props.from.split('.');
      if (!aliases.has(alias)) {
        throw new TemplateValidationError(`'let' from names undeclared alias '${alias}'`, at);
      }
    }
    node.children?.forEach((child, index) => {
      // Declarations against the outside world are the root's: `var`/`use` anywhere else is
      // rejected rather than silently declaring nothing.
      if ((child.tag === 'var' || child.tag === 'use') && node !== root) {
        throw new TemplateValidationError(`'${child.tag}' is only valid as a direct child of the root`, at);
      }
      check(child, scope, `${at} > ${child.tag}[${index}]`);
    });
  };
  check(root, rootDeclarations, 'root');
};
