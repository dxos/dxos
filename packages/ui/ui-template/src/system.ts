//
// Copyright 2026 DXOS.org
//

//
// SPIKE. The system model: one state tree, a URI-keyed registry, and operations as the only
// writer.
//
// The rules under test (ONTOLOGY R-1..R-15 plus the overnight decisions):
// - The complete *published* state of the system determines the layout. Components may hold
//   private state (a form's draft, an editor's cursor) that the system deliberately does not see;
//   it surfaces only at commit points, as an operation.
// - State changes ONLY through operations. An operation may also mutate the database — data is
//   then read back through bindings, so async updates arrive as new state and re-render.
// - Publication requires a name: an element that declares `id` opens a scope, and its `let`
//   children declare machine-backed slots published at `ui.<idPath>.<name>`. Anonymous elements
//   have no published state.
//
// Framework-free by construction, like the model. Generic over the database type so the core
// neither imports ECHO nor casts around it.
//

import { type ScopeFrame } from './model';

/** Published UI state: a nested tree of scope ids ending in slot values. */
export type UiState = Readonly<Record<string, unknown>>;

/**
 * The scope an operation runs in: slot names resolve lexically through the dispatching node's
 * enclosing frames (innermost wins), and `set` writes the named slots back into the ui tree.
 */
export type OperationScope = {
  has: (name: string) => boolean;
  get: (name: string) => unknown;
  /** Write slots by name. An undeclared name is an error, never a silent root write. */
  set: (patch: Record<string, unknown>) => void;
};

export type OperationContext<Db = unknown> = {
  ui: UiState;
  scope: OperationScope;
  payload?: unknown;
  /** The database. Operations are the only place it is written. */
  db?: Db;
};

export type OperationDef<Db = unknown> = {
  key: string;
  description?: string;
  /**
   * Steps the system: normally writes slots through `scope.set` and returns nothing; returning a
   * UiState overrides the tree wholesale. May mutate the db.
   */
  handler: (context: OperationContext<Db>) => UiState | void;
};

/**
 * A machine, tonight: a named slot with an initial value. The transition-table formalism
 * (states × events → operations) is specified in docs/DESIGN.md but not executed — a slot is
 * written by ordinary operations.
 */
export type MachineDef = {
  key: string;
  description?: string;
  initial: unknown;
};

/**
 * The unified registry: everything a template references, resolved by URI-style key
 * (`org.dxos.type.Contact`, `org.dxos.operation.list.select`, `org.dxos.machine.selection`).
 * A layout is then entirely references — nothing is inlined.
 */
export type Registry<Db = unknown, Schema = unknown> = {
  schemas: Readonly<Record<string, Schema>>;
  operations: Readonly<Record<string, OperationDef<Db>>>;
  machines: Readonly<Record<string, MachineDef>>;
};

export type LogEntry = {
  operation: string;
  payload?: unknown;
};

export class SystemError extends Error {
  readonly _tag = 'SystemError';
}

const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Read a nested value; `undefined` for a path that does not resolve. */
export const getIn = (obj: unknown, path: readonly string[]): unknown => {
  let value = obj;
  for (const key of path) {
    if (!isPlainObject(value)) {
      return undefined;
    }
    value = value[key];
  }
  return value;
};

/** Immutable nested write: replaces the leaf, sharing every untouched branch. */
export const setIn = (obj: UiState, path: readonly string[], value: unknown): UiState => {
  if (path.length === 0) {
    return isPlainObject(value) ? value : obj;
  }
  const [head, ...rest] = path;
  const child = obj[head];
  return {
    ...obj,
    [head]: rest.length === 0 ? value : setIn(isPlainObject(child) ? child : {}, rest, value),
  };
};

/** Write one slot at its publication path. */
export const setSlot = setIn;

/** The frames dispatch needs: publication path plus declared slot names. */
export type SlotFrame = Pick<ScopeFrame, 'path' | 'slots'>;

/**
 * One step: look up the operation, run it with a scope over the dispatching node's frames, return
 * the next ui state and the log entry. Pure with respect to `ui`; the db is the deliberate
 * exception (operations may mutate data).
 */
export const dispatch = <Db>(
  registry: Registry<Db>,
  ui: UiState,
  operation: string,
  payload?: unknown,
  db?: Db,
  frames: readonly SlotFrame[] = [],
): { ui: UiState; entry: LogEntry } => {
  const def = registry.operations[operation];
  if (!def) {
    throw new SystemError(`unknown operation '${operation}'`);
  }

  // The scope resolves slot names lexically — the innermost frame that declares the name wins —
  // and accumulates writes so a handler may set several slots and read its own writes back.
  let next = ui;
  const frameOf = (name: string): SlotFrame | undefined => frames.findLast((frame) => frame.slots.includes(name));
  const scope: OperationScope = {
    has: (name) => frameOf(name) !== undefined,
    get: (name) => {
      const frame = frameOf(name);
      return frame ? getIn(next, [...frame.path, name]) : undefined;
    },
    set: (patch) => {
      for (const [name, value] of Object.entries(patch)) {
        const frame = frameOf(name);
        if (!frame) {
          throw new SystemError(`no slot '${name}' in scope`);
        }
        next = setIn(next, [...frame.path, name], value);
      }
    },
  };

  const result = def.handler({ ui, scope, payload, db });
  return { ui: result ?? next, entry: { operation, payload } };
};

/**
 * Seed published state from a template: walking the tree depth-first tracking the `id` path,
 * every `let` under a scoped element gets its machine's initial value at `ui.<idPath>.<name>`.
 * This is the declarative binding — the template names the machine, the registry supplies the
 * value.
 */
export type WalkNode = {
  readonly tag?: string;
  readonly props?: Readonly<Record<string, string | number | boolean>>;
  readonly children?: readonly WalkNode[];
};

export const seedUi = (registry: Registry<never>, root: WalkNode): UiState => {
  let ui: UiState = {};
  const visit = (node: WalkNode, idPath: readonly string[]): void => {
    const path = typeof node.props?.id === 'string' ? [...idPath, node.props.id] : idPath;
    for (const child of node.children ?? []) {
      if (child.tag === 'let') {
        const name = String(child.props?.name);
        if (child.props && 'initial' in child.props) {
          // Rung 1: a plain writable slot seeded from the literal initial value.
          ui = setIn(ui, [...path, name], child.props.initial);
          continue;
        }
        const machine = String(child.props?.machine);
        const def = registry.machines[machine];
        if (!def) {
          throw new SystemError(`unknown machine '${machine}'`);
        }
        ui = setIn(ui, [...path, name], def.initial);
      } else {
        visit(child, path);
      }
    }
  };
  visit(root, []);
  return ui;
};

/** Depth-first walk, for audits. */
export function* walk(node: WalkNode): Generator<WalkNode> {
  yield node;
  for (const child of node.children ?? []) {
    yield* walk(child);
  }
}
