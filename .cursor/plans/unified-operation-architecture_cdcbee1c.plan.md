---
name: ""
overview: ""
todos: []
---

# Unified Operation Architecture Plan

## 1. Review & Analysis

The proposed unification addresses valid architectural redundancy. However, the "Option 1" (Remove Chaining) strategy introduces a trade-off regarding **Atomic Undo** that requires mitigation.

### Critical Findings

-   **Chaining & Undo:** `chain()` is the only mechanism ensuring multiple intents (`Create` -> `Add`) are treated as a single Undo entry. Replacing `chain()` with sequential `dispatch()` calls will fragment history, forcing users to undo twice for one logical action.
-   **Sync vs Async:** Most core business logic (ECHO, Client, Network) is inherently asynchronous. The push for "Synchronous Execution" via `Effect.runSync` is limited to pure UI state changes (Layout, Toast). Enforcing sync capabilities broadly is impractical and brittle.
-   **Service Injection:** The gap between `PluginContext` (Intents) and `FunctionServices` (Functions) is the main friction point for code sharing.
-   **Factory Pattern Adoption:** "Create" intents are increasingly being replaced by `Type.make()` (or `Obj.make(Type)`) patterns. This simplifies the architecture by moving creation logic to the data model itself, reducing the need for heavy intent resolvers just for instantiation.
-   **Core Separation:** Triggers, Schedule, and Undo are distinct concerns from the core Operation definition. Mixing them creates a bloated interface. They should be layered capabilities.

## 2. Revised Strategy

We will adopt **Option 3 (Effect-First)** as the foundation, but refine **Option 1 (Remove Chaining)** to encourage **Coarse-Grained Intents** (e.g., `CreateAndAdd`) rather than just fragmenting chains. This preserves atomicity where it matters.

### Phase 1: Operation Primitives & Function Bridge [COMPLETE]

*Goal: Establish the new "Operation" core and prove it by running Functions on top of it, without touching the UI/Intent system yet.*

-   **Define Primitives:**
    -   `OperationDefinition`: The serializable schema (Input, Output, Meta including Key).
    -   `OperationHandler`: The Effect-based runtime logic type.
-   **Function Adapter:**
    -   Update `FunctionDefinition` to extend or map to `OperationDefinition`.
    -   Ensure existing Functions can be defined using the `Operation.make` syntax (or a compatible wrapper).
    -   This validates the primitive without breaking the UI.

**Completed:** Core `Operation` module implemented in [`packages/core/operation`](packages/core/operation/src/operation.ts) with `Operation.make()` factory, Effect-based handlers, and pipeable interface.

### Phase 2: Intent Audit & Simplification [COMPLETE]

*Goal: Prepare the Intent system for replacement by removing its most complex feature: chaining.*

-   **Audit Chains:** Identified 36 usages of `chain()`.
-   **Refactor Strategy:**
    -   **Navigation Chains:** Convert to sequential calls (No Undo requirement).
    -   **Mutation Chains:** Refactor into atomic operations (e.g., `Type.make()` + `db.add()`) or specific coarse-grained operations.
-   **Deprecate Chain:** Remove the `chain()` utility once usages are gone.

**Completed:**

-   ✅ Replaced `createObjectIntent` with `createObject` in all plugins (24 files updated)
-   ✅ Updated `CreateObject` type to return `Effect.Effect<Obj.Any, any, any>` instead of intent chain
-   ✅ Extended `CreateObject` options to include `context: PluginContext` for accessing capabilities
-   ✅ Updated `CreateObjectDialog` to call `createObject` directly, passing db and context
-   ✅ Removed `CreateObjectIntent` type (deprecated)
-   ✅ WNFS `createObject` now dispatches `WnfsAction.CreateFile` intent for upload + create
-   ✅ Mailbox/Calendar `createObject` uses `ClientCapabilities.Client` to get space from db
-   ✅ PersistentType `createObject` uses dispatch for `UseStaticSchema`/`AddSchema` intents

### Phase 3: Replace Intents with Operations [COMPLETE]

*Goal: The Big Switch. Swap the underlying engine of the UI from "Intents" to "Operations".***Architecture (Pub/Sub):**

-   **OperationRegistry:** Collects handlers from `Capability.OperationHandler` contributions
-   **UndoRegistry:** Collects undo mappings from `Capability.UndoMapping` contributions (independent)
-   **OperationInvoker:** Invokes operations, exposes `invocations$` Effect stream
-   **HistoryTracker:** Subscribes to stream, tracks history, provides `undo()`

**Completed:**

-   ✅ Core `OperationInvoker` implemented in `packages/sdk/app-framework/src/plugin-operation/invoker`
-   ✅ `OperationResolver.make()` factory for type-safe handler registration
-   ✅ `UndoMapping` and `HistoryTracker` for undo support
-   ✅ Plugins migrated to contribute `OperationResolver` capabilities

### Phase 4: Function Invocation via Operations [IN PROGRESS]

*Goal: Unify the calling convention so Operations can be invoked locally or deployed remotely.***See detailed plan:** [`function_to_operation_migration_27db1600.plan.md`](function_to_operation_migration_27db1600.plan.md)**Sub-phases:**

-   **Phase 0:** Followup scheduling (FollowupScheduler service for tracked background operations)
-   **Phase 1:** Extend OperationDefinition (types, services, deployedId, required executionMode)
-   **Phase 2:** Unified handler signature (OperationContext service, FunctionHandler adapter)
-   **Phase 3:** Function.Function bridge (serialize Operations to existing Function schema)
-   **Phase 4:** Deployment bridge (deploy Operations to EDGE via existing infrastructure)
-   **Phase 5:** Trigger integration (TriggerDispatcher routes to local OperationResolvers)
-   **Phase 6:** Deprecate defineFunction (remove FunctionDefinition)

### Phase 5: Remote Simplification (Future)

*Goal: Collapse the "Function" abstraction entirely.*

-   Remove `FunctionDefinition` entirely in favor of `OperationDefinition`.
-   Directly deploy Operations to the Edge.

## 3. Implementation Details

### Interface Definitions

```typescript
// 1. Serializable Definition (What it is)
export interface OperationDefinition<I, O> extends Pipeable.Pipeable {
  readonly schema: {
    readonly input: Schema.Schema<I>;
    readonly output: Schema.Schema<O>;
  };
  readonly meta: {
    readonly key: string;     // e.g. "space.create" (Unified Key)
    readonly label: string;
    readonly description?: string;
  };
  // Hint to the dispatcher. Defaults to 'async' if undefined.
  readonly executionMode?: 'sync' | 'async'; 
}

// 2. Factory Pattern (Namespace API)
// Usage: Operation.make(...)
export const make = <I, O>(
  props: OperationProps<I, O>
): OperationDefinition<I, O> => {
  // Implementation...
  return { ...props, pipe() { return Pipeable.pipeArguments(this, arguments); } };
}

// 3. Invocation Interface (Unified)
// Local Invocation (Default)
type Invoke = <I, O, E>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, E>;

// Remote Invocation (Explicit)
// Explicitly invokes the operation via the Edge Runtime
type InvokeRemote = <I, O, E>(
  op: OperationDefinition<I, O>, 
  input: I, 
  options?: { timeout?: number }
) => Effect.Effect<O, E>;
```



### Examples of Execution Modes

#### 1. Local Sync Operation (UI State)

*Pure synchronous logic. Runs immediately on the main thread.*

```typescript
// Definition
const SetLayoutMode = Operation.make({
  meta: {
    key: 'layout.setMode',
  },
  executionMode: 'sync', // Explicitly marked as sync
  input: Schema.Struct({ mode: Schema.String }),
  output: Schema.Void
});

// Implementation
const handleSetLayoutMode = (input) => Effect.sync(() => {
  uiState.mode = input.mode;
});

// Usage
// Explicit 'sync' mode allows Effect.runSync
Effect.runSync(invoke(SetLayoutMode, { mode: 'deck' })); 
```



#### 2. Local Async Operation (Database)

*Asynchronous logic running in the local client. Default mode.*

```typescript
// Definition
const CreateSpace = Operation.make({
  meta: {
    key: 'space.create',
  },
  // executionMode defaults to 'async'
  input: Schema.Struct({ name: Schema.String }),
  output: Schema.Struct({ id: Schema.String })
});

// Implementation
const handleCreateSpace = (input) => Effect.gen(function* () {
  const client = yield* ClientService;
  const space = yield* Effect.tryPromise(() => client.spaces.create(input));
  return { id: space.id };
});

// Usage
yield* invoke(CreateSpace, { name: 'My Space' });
```



#### 3. Remote Async Operation (Edge Function)

*Explicit remote invocation via `invokeRemote`.*

```typescript
// Definition (Same structure)
const AnalyzeText = Operation.make({
  meta: {
    key: 'ai.analyzeText',
  },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.Struct({ sentiment: Schema.Number })
});

// Generic Remote Invoker (System Component)
// This is what `invokeRemote` uses internally.
const remoteInvokeHandler = (op, input) => Effect.gen(function* () {
  const db = yield* DatabaseService;
  const remoteService = yield* RemoteFunctionService;

  // 1. Find the Function object in ECHO matching the key
  const [func] = yield* db.query(Filter.from({ 
    type: FunctionType, 
    key: op.meta.key 
  })).run();

  if (!func || !func.deployedFunctionId) {
    return yield* Effect.fail(new Error(`Remote function not found: ${op.meta.key}`));
  }

  // 2. Invoke via Edge Service
  return yield* remoteService.invoke(func.deployedFunctionId, input);
});

// Usage
// Explicitly call invokeRemote to run on edge
yield* invokeRemote(AnalyzeText, { text: "Hello world" });
```



### Migrating `Create` -> `Add` (Example)

**Current (Chained Intent):**

```typescript
createIntent(SpaceAction.Create, { ... })
  .chain(SpaceAction.AddObject, { ... })
```

**New (Factory Pattern with Effect):**

```typescript
// Metadata definition (plugin registration)
{
  id: MyType.typename,
  metadata: {
    createObject: ((props) => Effect.sync(() => MyType.make(props))) satisfies CreateObject,
    addToCollectionOnCreate: true,
  },
}

// CreateObjectDialog (calling createObject directly)
const object = yield* metadata.createObject(data, { db });
if (isLiveObject(object)) {
  yield* dispatch(createIntent(SpaceAction.AddObject, { target, object }));
  yield* dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [Obj.getDXN(object).toString()] }));
}
```

*Benefits: Clear separation of instantiation (sync Effect) vs. persistence (intent) vs. navigation (intent).*

### Service Injection

```typescript
// Define a Service Tag
export class DatabaseService extends Context.Tag('DatabaseService')<
  DatabaseService,
  {
    readonly add: (obj: EchoObject) => Effect.Effect<void>;
    readonly query: (filter: Filter) => Effect.Effect<EchoObject[]>;
  }
>() {}

// Plugin Implementation (Browser)
export const PluginDatabaseLayer = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    add: (obj) => Effect.sync(() => space.db.add(obj)),
    query: (filter) => Effect.sync(() => space.db.query(filter).run())
  })
);

// Function Implementation (Edge)
export const EdgeDatabaseLayer = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    // ... remote/edge implementation ...
  })
);



























```