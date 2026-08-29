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

import { type ModuleView, type ScopeFrame } from './model';

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

/** Read another module's state export — the readonly, public column of the module contract. */
export type ModuleRead = (module: string, name: string) => unknown;

export type OperationContext<TDatabase = unknown> = {
  ui: UiState;
  scope: OperationScope;
  payload?: unknown;
  /** The database. Operations are the only place it is written. */
  db?: TDatabase;
  /** Read another module's state — observation is shared; mutation stays with the owner. */
  read: ModuleRead;
  /**
   * Dispatch another operation by key — the ONLY cross-module write path: foreign state changes
   * by asking its owner, never by writing its slots.
   */
  invoke: (operation: string, payload?: unknown) => void;
};

export type OperationDef<TDatabase = unknown> = {
  key: string;
  description?: string;
  /**
   * Steps the system: normally writes slots through `scope.set` and returns nothing; returning a
   * UiState overrides the tree wholesale. May mutate the db.
   */
  handler: (context: OperationContext<TDatabase>) => UiState | void;
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

export type ModuleStateContext = {
  /** The module's own slot values. */
  slots: Readonly<Record<string, unknown>>;
  /** Host-supplied inputs for this module (query results, wiring), by name. */
  inputs: Readonly<Record<string, unknown>>;
  /** Read another module's state export — cross-module reads are public. */
  read: ModuleRead;
};

/** Column 1 of the module contract: one reactive readonly state export. */
export type ModuleStateDef = {
  description?: string;
  /** Derive the export's current value — pure over slots × inputs × other modules' state. */
  derive: (context: ModuleStateContext) => unknown;
};

/** A state export backed 1:1 by a module slot. */
export const fromSlot = (name: string): ModuleStateDef => ({ derive: ({ slots }) => slots[name] });

/** What a capability factory is handed at mount — the instance's ONLY write path. */
export type CapabilityMountContext = {
  /** Dispatch one of the owning module's operations; `onChange` snapshots machine state through it. */
  invoke: (operation: string, payload?: unknown) => void;
};

/**
 * A mounted capability: the typed connect surface binders drive (event senders), plus teardown.
 * The api never carries readable state — reads flow back through the published slot, so the
 * machine stays an implementation detail behind it.
 */
export type CapabilityInstance = {
  api: unknown;
  /** Restart a stopped backing (idempotent) — React strict mode disposes and remounts. */
  start?: () => void;
  dispose?: () => void;
};

/** Column 3 of the module contract: a machine instance — a typed API over the module's state. */
export type CapabilityDef = {
  description?: string;
  /** The registry machine whose instance this capability is. */
  machine: string;
  /** The module slot holding the instance's current state. */
  slot: string;
  /**
   * Optional live backing: create the module-shared instance at system mount (never per render).
   * Every transition must reach published state as `onChange` → `invoke(<own operation>)` →
   * `scope.set(<slot>)` — so the operation log records the machine's history.
   */
  create?: (context: CapabilityMountContext) => CapabilityInstance;
};

/**
 * The module contract: a module provides exactly three things — reactive readonly state
 * (consumers bind, never write), operations (typed one-shot writes that mutate ONLY this
 * module's slots), and capabilities (machine instances shared by every binder). The slots are
 * the private substrate under all three columns.
 */
export type ModuleDef<TDatabase = unknown> = {
  key: string;
  description?: string;
  /** Writable slots — the module's substrate; only its own operations write them. */
  slots: Readonly<Record<string, { initial: unknown }>>;
  /** Column 1: reactive readonly state. */
  state: Readonly<Record<string, ModuleStateDef>>;
  /** Column 2: typed one-shot writes — the only writers of this module's slots. */
  operations: Readonly<Record<string, OperationDef<TDatabase>>>;
  /** Column 3: machine instances over the module's slots. */
  capabilities: Readonly<Record<string, CapabilityDef>>;
};

/** Host-supplied inputs, keyed by module key then input name. */
export type ModuleInputs = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/**
 * The unified registry: everything a template references, resolved by URI-style key
 * (`org.dxos.type.Contact`, `org.dxos.operation.list.select`, `org.dxos.machine.selection`).
 * A layout is then entirely references — nothing is inlined. The flat `operations` table holds
 * an anonymous template's local operations; a named module's operations live in its own table
 * (`modules`), where dispatch scopes their writes to the module's slots.
 */
export type Registry<TDatabase = unknown, Schema = unknown> = {
  schemas: Readonly<Record<string, Schema>>;
  operations: Readonly<Record<string, OperationDef<TDatabase>>>;
  machines: Readonly<Record<string, MachineDef>>;
  modules: Readonly<Record<string, ModuleDef<TDatabase>>>;
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
 * Read module state through the registry: `read(module, export)` runs the export's derivation
 * over the module's current slots, its host inputs, and — via the same reader — other modules'
 * state. `ui` is a getter so a dispatch in progress reads its own accumulated writes. An unknown
 * module or export is an error (registration/mount row of the error table), and so is a circular
 * derivation.
 */
export const createModuleReader = <TDatabase>(
  registry: Registry<TDatabase>,
  ui: () => UiState,
  inputs: ModuleInputs = {},
): ModuleRead => {
  const reading = new Set<string>();
  const read: ModuleRead = (moduleKey, name) => {
    const module = registry.modules[moduleKey];
    if (!module) {
      throw new SystemError(`unknown module '${moduleKey}'`);
    }
    const def = module.state[name];
    if (!def) {
      throw new SystemError(`unknown state export '${moduleKey}.${name}'`);
    }
    const token = `${moduleKey}.${name}`;
    if (reading.has(token)) {
      throw new SystemError(`circular state derivation '${token}'`);
    }
    reading.add(token);
    try {
      const slots = ui()[moduleKey];
      return def.derive({
        slots: isPlainObject(slots) ? slots : {},
        inputs: inputs[moduleKey] ?? {},
        read,
      });
    } finally {
      reading.delete(token);
    }
  };
  return read;
};

/** Mounted capability instances, keyed by module key then capability name. */
export type CapabilityInstances = Readonly<Record<string, Readonly<Record<string, CapabilityInstance>>>>;

/**
 * Create every factory-backed capability instance — one per module capability, shared by all
 * binders for the system's lifetime. `invoke` is the host's dispatch: the instance writes
 * published state only by dispatching its own module's operations.
 */
export const mountCapabilities = <TDatabase>(
  registry: Registry<TDatabase>,
  invoke: (operation: string, payload?: unknown) => void,
): CapabilityInstances => {
  const instances: Record<string, Record<string, CapabilityInstance>> = {};
  for (const [key, module] of Object.entries(registry.modules)) {
    for (const [name, capability] of Object.entries(module.capabilities)) {
      if (capability.create) {
        (instances[key] ??= {})[name] = capability.create({ invoke });
      }
    }
  }
  return instances;
};

/** (Re)start mounted instances — idempotent; pairs with {@link unmountCapabilities}. */
export const startCapabilities = (instances: CapabilityInstances): void => {
  for (const module of Object.values(instances)) {
    for (const instance of Object.values(module)) {
      instance.start?.();
    }
  }
};

/** Tear the mounted instances down (machine stop, subscriptions). */
export const unmountCapabilities = (instances: CapabilityInstances): void => {
  for (const module of Object.values(instances)) {
    for (const instance of Object.values(module)) {
      instance.dispose?.();
    }
  }
};

/** Materialize every registry module's contract for binding (state + capability columns). */
export const viewModules = <TDatabase>(
  registry: Registry<TDatabase>,
  ui: UiState,
  inputs: ModuleInputs = {},
  instances: CapabilityInstances = {},
): Record<string, ModuleView> => {
  const read = createModuleReader(registry, () => ui, inputs);
  const views: Record<string, ModuleView> = {};
  for (const [key, module] of Object.entries(registry.modules)) {
    const state: Record<string, unknown> = {};
    for (const name of Object.keys(module.state)) {
      state[name] = read(key, name);
    }
    const capabilities: Record<string, unknown> = {};
    const apis: Record<string, unknown> = {};
    for (const [name, capability] of Object.entries(module.capabilities)) {
      capabilities[name] = getIn(ui, [key, capability.slot]);
      const instance = instances[key]?.[name];
      if (instance) {
        apis[name] = instance.api;
      }
    }
    views[key] = { key, state, capabilities, apis };
  }
  return views;
};

/**
 * One step: look up the operation, run it, return the next ui state and the log entries (the
 * dispatched operation first, then anything it `invoke`d). A key in the flat table runs with a
 * scope over the dispatching node's frames; a key owned by a module runs with a scope over the
 * module's OWN slots — the write-ownership rule (R-3's owner clause) is this scoping, so a
 * handler cannot name, let alone write, another module's state. Pure with respect to `ui`; the
 * db is the deliberate exception (operations may mutate data).
 */
export const dispatch = <TDatabase>(
  registry: Registry<TDatabase>,
  ui: UiState,
  operation: string,
  payload?: unknown,
  db?: TDatabase,
  frames: readonly SlotFrame[] = [],
  inputs: ModuleInputs = {},
): { ui: UiState; entries: LogEntry[] } => {
  let next = ui;
  const entries: LogEntry[] = [];
  const read = createModuleReader(registry, () => next, inputs);

  // The template scope resolves slot names lexically — the innermost frame that declares the
  // name wins — and accumulates writes so a handler reads its own writes back.
  const frameOf = (name: string): SlotFrame | undefined => frames.findLast((frame) => frame.slots.includes(name));
  const templateScope: OperationScope = {
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

  const moduleScope = (module: ModuleDef<TDatabase>): OperationScope => ({
    has: (name) => name in module.slots,
    get: (name) => getIn(next, [module.key, name]),
    set: (patch) => {
      for (const [name, value] of Object.entries(patch)) {
        if (!(name in module.slots)) {
          throw new SystemError(`module '${module.key}' owns no slot '${name}'`);
        }
        next = setIn(next, [module.key, name], value);
      }
    },
  });

  const ownerOf = (key: string): ModuleDef<TDatabase> | undefined =>
    Object.values(registry.modules).find((module) => Object.values(module.operations).some((def) => def.key === key));

  const run = (key: string, runPayload?: unknown): void => {
    const owner = ownerOf(key);
    const def = owner
      ? Object.values(owner.operations).find((candidate) => candidate.key === key)
      : registry.operations[key];
    if (!def) {
      throw new SystemError(`unknown operation '${key}'`);
    }
    entries.push({ operation: key, payload: runPayload });
    const result = def.handler({
      ui: next,
      scope: owner ? moduleScope(owner) : templateScope,
      payload: runPayload,
      db,
      read,
      invoke: run,
    });
    if (result) {
      // A wholesale ui replacement would bypass write ownership, so only an anonymous
      // template's local operation may return one.
      if (owner) {
        throw new SystemError(`module operation '${key}' must write through scope.set`);
      }
      next = result;
    }
  };

  run(operation, payload);
  return { ui: next, entries };
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
        if (child.props && 'from' in child.props) {
          // Rung 3: the slot mirrors a module capability — the module seeds it, not the template.
          continue;
        }
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

/**
 * Seed every registry module's slots at `ui.<moduleKey>.<slot>`. Module instances are shared —
 * seeded once from the registry, not per template — while `seedUi` seeds only the template's
 * private (`initial=`/`machine=`) slots.
 */
export const seedModules = <TDatabase>(registry: Registry<TDatabase>): UiState => {
  let ui: UiState = {};
  for (const [key, module] of Object.entries(registry.modules)) {
    for (const [name, slot] of Object.entries(module.slots)) {
      ui = setIn(ui, [key, name], slot.initial);
    }
  }
  return ui;
};

/**
 * Registration/mount check for a template's module wiring: every `use` must name a registry
 * module, and every `let from=` must target one of its capabilities (whose slot and machine must
 * themselves exist). Returns messages for the host to surface visibly per R-8.
 */
export const checkUses = <TDatabase>(registry: Registry<TDatabase>, root: WalkNode): string[] => {
  const errors: string[] = [];
  const aliasModule: Record<string, string> = {};
  for (const child of root.children ?? []) {
    if (child.tag === 'use' && typeof child.props?.as === 'string' && typeof child.props?.module === 'string') {
      aliasModule[child.props.as] = child.props.module;
      if (!registry.modules[child.props.module]) {
        errors.push(`use '${child.props.as}': unknown module '${child.props.module}'`);
      }
    }
  }
  for (const node of walk(root)) {
    // A component-side capability binding (`capability="alias.name"`) must resolve like `let from=`.
    if (node.tag !== 'let' && typeof node.props?.capability === 'string') {
      const [alias, name] = node.props.capability.split('.');
      const module = aliasModule[alias] === undefined ? undefined : registry.modules[aliasModule[alias]];
      if (module && !module.capabilities[name]) {
        errors.push(`capability '${node.props.capability}': unknown capability on module '${aliasModule[alias]}'`);
      }
    }
    if (node.tag !== 'let' || typeof node.props?.from !== 'string') {
      continue;
    }
    const [alias, capability] = node.props.from.split('.');
    const moduleKey = aliasModule[alias];
    const module = moduleKey === undefined ? undefined : registry.modules[moduleKey];
    if (!module) {
      // A missing alias is a parse error; a missing module is already reported above.
      continue;
    }
    const def = module.capabilities[capability];
    if (!def) {
      errors.push(`let from '${node.props.from}': unknown capability on module '${moduleKey}'`);
      continue;
    }
    if (!(def.slot in module.slots)) {
      errors.push(`module '${moduleKey}' capability '${capability}' names unknown slot '${def.slot}'`);
    }
    if (!registry.machines[def.machine]) {
      errors.push(`module '${moduleKey}' capability '${capability}' names unknown machine '${def.machine}'`);
    }
  }
  return errors;
};

/** One entry of a template's signature: a typed, host-supplied input declared by a root `var`. */
export type VarDecl = {
  name: string;
  /** A registry schema key. */
  type: string;
  many?: boolean;
  optional?: boolean;
};

/** Read the signature off a template root's direct `var` children. */
export const varDecls = (root: WalkNode): VarDecl[] =>
  (root.children ?? []).flatMap((child) => {
    if (child.tag !== 'var' || typeof child.props?.name !== 'string' || typeof child.props?.type !== 'string') {
      return [];
    }
    return [
      {
        name: child.props.name,
        type: child.props.type,
        ...(child.props.many === true ? { many: true } : null),
        ...(child.props.optional === true ? { optional: true } : null),
      },
    ];
  });

/**
 * Mount check: the host-supplied values against the template's `var` signature. An unknown
 * `type=` key is a registration error; a missing required input, a non-array for `many`, or a
 * value failing `isValid` (schema decode, supplied by the host layer that owns the schema
 * representation) is a mount error. Returns messages for the host to surface visibly — a failed
 * signature must never render as though the data were absent.
 */
export const checkVars = <S>(
  schemas: Readonly<Record<string, S>>,
  decls: readonly VarDecl[],
  values: Readonly<Record<string, unknown>>,
  isValid?: (schema: S, value: unknown) => boolean,
): string[] => {
  const errors: string[] = [];
  for (const decl of decls) {
    const schema = schemas[decl.type];
    if (schema === undefined) {
      errors.push(`var '${decl.name}': unknown type '${decl.type}'`);
      continue;
    }
    const value = values[decl.name];
    if (value === undefined) {
      if (decl.optional !== true) {
        errors.push(`var '${decl.name}' is required`);
      }
      continue;
    }
    if (decl.many === true) {
      if (!Array.isArray(value)) {
        errors.push(`var '${decl.name}' expects an array`);
        continue;
      }
      if (isValid && !value.every((element) => isValid(schema, element))) {
        errors.push(`var '${decl.name}': an element does not satisfy '${decl.type}'`);
      }
      continue;
    }
    if (isValid && !isValid(schema, value)) {
      errors.push(`var '${decl.name}' does not satisfy '${decl.type}'`);
    }
  }
  return errors;
};

/** Depth-first walk, for audits. */
export function* walk(node: WalkNode): Generator<WalkNode> {
  yield node;
  for (const child of node.children ?? []) {
    yield* walk(child);
  }
}
