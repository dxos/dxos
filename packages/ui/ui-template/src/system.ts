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
// - Publication requires a name: a template instance that wants observable state declares `id`,
//   and its state lives at `ui.<id>`, shaped by its machine's state schema. Anonymous instances
//   have no published state.
//
// Framework-free by construction, like the model. Generic over the database type so the core
// neither imports ECHO nor casts around it.
//

export type InstanceState = Readonly<Record<string, unknown>>;

/** Published UI state, by declared instance id. */
export type UiState = Readonly<Record<string, InstanceState>>;

export type OperationContext<Db = unknown> = {
  ui: UiState;
  payload?: unknown;
  /** The database. Operations are the only place it is written. */
  db?: Db;
};

export type OperationDef<Db = unknown> = {
  key: string;
  description?: string;
  /** Returns the next ui state (or nothing, for a pure data mutation). May mutate the db. */
  handler: (context: OperationContext<Db>) => UiState | void;
};

/**
 * A machine, tonight: a named state shape with an initial value. The transition-table formalism
 * (states × events → operations) is specified in docs/DESIGN.md but not executed — an instance's
 * slot is written by ordinary operations.
 */
export type MachineDef = {
  key: string;
  description?: string;
  initial: InstanceState;
};

/**
 * The unified registry: everything a template references, resolved by URI-style key
 * (`org.dxos.type.Contact`, `org.dxos.operation.list.select`, `org.dxos.machine.master-detail`).
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

/** Merge one instance's slot. The slot replaces wholesale — machines own their shape. */
export const withInstance = (ui: UiState, id: string, state: InstanceState): UiState => ({ ...ui, [id]: state });

/**
 * One step: look up the operation, run it, return the next ui state and the log entry. Pure with
 * respect to `ui`; the db is the deliberate exception (operations may mutate data).
 */
export const dispatch = <Db>(
  registry: Registry<Db>,
  ui: UiState,
  operation: string,
  payload?: unknown,
  db?: Db,
): { ui: UiState; entry: LogEntry } => {
  const def = registry.operations[operation];
  if (!def) {
    throw new SystemError(`unknown operation '${operation}'`);
  }
  const next = def.handler({ ui, payload, db });
  return { ui: next ?? ui, entry: { operation, payload } };
};

/**
 * Seed published state from a template: every node that declares both `id` and `machine` gets its
 * machine's initial state at `ui.<id>`. This is the declarative binding — the template names the
 * machine, the registry supplies the shape.
 */
export type WalkNode = {
  readonly props?: Readonly<Record<string, string | number | boolean>>;
  readonly children?: readonly WalkNode[];
};

export const seedUi = (registry: Registry<never>, root: WalkNode): UiState => {
  let ui: UiState = {};
  for (const node of walk(root)) {
    const id = node.props?.id;
    const machine = node.props?.machine;
    if (typeof id === 'string' && typeof machine === 'string') {
      const def = registry.machines[machine];
      if (!def) {
        throw new SystemError(`unknown machine '${machine}'`);
      }
      ui = withInstance(ui, id, def.initial);
    }
  }
  return ui;
};

/** Depth-first walk, for seeding and audits. */
export function* walk(node: WalkNode): Generator<WalkNode> {
  yield node;
  for (const child of node.children ?? []) {
    yield* walk(child);
  }
}
