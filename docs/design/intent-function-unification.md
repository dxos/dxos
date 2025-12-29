# Intent and Function Unification Analysis

## Overview

This document analyzes the Intent and Function systems in DXOS, comparing their architectures, identifying commonalities, and exploring options for unification.

## Current Systems

### Intents

Intents are the primary mechanism for cross-plugin communication in the app-framework. They represent abstract operations that can be performed across plugin boundaries.

**Key Components:**

1. **Intent Schema** (`Schema.TaggedClass`): Defines the intent's tag, input schema, and output schema.
2. **Intent Chain**: A sequence of intents where output flows to subsequent intents.
3. **Intent Resolver**: Matches intents to their implementations.
4. **Intent Dispatcher**: Routes intents to resolvers and manages execution.

**Example Intent Definition:**

```typescript
class SpaceAction.Create extends Schema.TaggedClass<Create>()(`${SPACE_ACTION}/create`, {
  input: SpaceForm,
  output: Schema.Struct({
    id: Schema.String,
    space: SpaceSchema,
  }),
}) {}
```

**Example Resolver:**

```typescript
createResolver({
  intent: SpaceAction.Create,
  resolve: async ({ name, hue, icon }) => {
    const space = await client.spaces.create({ name, hue, icon });
    return {
      data: { id: space.id, space },
      undoable: { message: 'Space created', data: { spaceId: space.id } },
      intents: [createIntent(ObservabilityAction.SendEvent, { name: 'space.create' })],
    };
  },
});
```

**Key Characteristics:**

- **Chaining**: Intents can be composed via `chain()`, where output of one intent becomes input of the next.
- **Undo Support**: Resolvers can return `undoable` data to enable undo operations.
- **Follow-up Intents**: Resolvers can return additional intents to be dispatched.
- **Effect Support**: Resolvers can return Effect, Promise, or synchronous values.
- **Position/Priority**: Resolvers can specify `position: 'hoist' | 'fallback'` for ordering.
- **Filtering**: Resolvers can specify filters to match specific intent data patterns.
- **Runtime Discovery**: Resolvers are discovered at runtime from plugins.

### Functions

Functions are the mechanism for defining and executing compute operations, primarily targeting edge/serverless deployment.

**Key Components:**

1. **FunctionDefinition**: Defines function metadata, schemas, and handler.
2. **FunctionHandler**: The implementation that processes input and returns output.
3. **FunctionInvocationService**: Routes function calls between local and remote execution.
4. **TriggerDispatcher**: Schedules and invokes functions based on triggers (timer, queue, subscription).

**Example Function Definition:**

```typescript
defineFunction({
  key: 'my-function',
  name: 'My Function',
  description: 'Does something',
  inputSchema: Schema.Struct({ value: Schema.Number }),
  outputSchema: Schema.Struct({ result: Schema.String }),
  types: [],
  services: [Database.Service],
  handler: async ({ context, data }) => {
    return { result: data.value.toString() };
  },
});
```

**Key Characteristics:**

- **Schema Validation**: Input/output schemas are validated at invocation time.
- **Service Dependencies**: Functions declare required services (Database, AI, Credentials, etc.).
- **Local/Remote Execution**: Functions can run locally or be deployed to edge runtime.
- **Trigger-Based**: Functions are invoked via triggers (timer, queue, subscription, webhook).
- **Effect Support**: Handlers can return Effect, Promise, or synchronous values.
- **Serialization**: Functions can be serialized to/from ECHO objects for persistence.

---

## Comparison Matrix

| Aspect | Intents | Functions |
|--------|---------|-----------|
| **Primary Use Case** | UI/Plugin orchestration | Background/edge compute |
| **Invocation** | `dispatch(createIntent(...))` | Trigger-based or direct invocation |
| **Schema** | `Schema.TaggedClass` with input/output | `inputSchema`/`outputSchema` properties |
| **Chaining** | Built-in via `chain()` | Not supported |
| **Undo** | Built-in support | Not supported |
| **Follow-up Actions** | Via `intents` return field | Not supported |
| **Service Access** | Via `PluginContext` capabilities | Via Effect Layer dependency injection |
| **Execution Model** | Always local, synchronous dispatch | Local or remote, async |
| **Discovery** | Runtime from plugins | Registry-based |
| **Effect Integration** | Partial (dispatch returns Effect) | First-class |
| **Filtering** | Via `filter` predicate | Not supported |
| **Priority** | Via `position` field | Not supported |

---

## Architectural Similarities

1. **Schema-Driven**: Both use Effect Schema for type-safe input/output definitions.
2. **Effect Support**: Both support Effect-based implementations.
3. **Service Pattern**: Both inject services/capabilities into handlers.
4. **Tag-Based Routing**: Both use string tags for routing (intent `_tag` vs function `key`).

---

## Unification Options

### Option 1: Remove Chaining from Intents (Minimal Unification)

**Approach**: Simplify intents by removing the built-in chaining mechanism, making them more similar to functions.

**Changes:**
- `createIntent()` returns a single intent, not an `IntentChain`.
- Chaining becomes explicit in resolver implementations.
- `dispatch()` accepts a single intent.

**Benefits:**
- Simpler API surface.
- Reduces complexity in dispatcher.
- Makes output types clearer (no chain type gymnastics).

**Drawbacks:**
- Breaking change for existing chain usages.
- Loses declarative composition.
- Chained intents with undo become harder to implement.

**Migration Path:**

```typescript
// Before
const intent = pipe(
  createIntent(Compute, { value: 1 }),
  chain(ToString, {}),
);

// After
const resolver = createResolver({
  intent: Compute,
  resolve: async (data) => {
    const computed = { value: data.value * 2 };
    const stringResult = await dispatch(createIntent(ToString, computed));
    return { data: stringResult };
  },
});
```

**Chain Usage Audit:**

Based on code analysis, `chain()` is used in **33 locations** across the codebase:

| Pattern | Count | Examples |
|---------|-------|----------|
| `Create` → `AddObject` | ~10 | Script, Chess, Table, Kanban, Map, Markdown, Meeting |
| `*Action` → `LayoutAction.Open` | ~8 | Files, Deck, Settings, CreateDialog |
| `*Action` → `SwitchWorkspace` | 2 | Close space, onboarding |
| Multi-step chains (3+) | 4 | Meeting create, inbox navigation, help feedback |
| Other combinations | ~9 | Various plugin-specific flows |

**Common Patterns:**

1. **Create-then-add**: `Create` → `AddObject` (most common)
2. **Action-then-navigate**: `*Action` → `Open`/`SwitchWorkspace`
3. **Multi-step flows**: `Close` → `Switch` → `Open`

**Migration Complexity:**

- Most chains follow 2-3 predictable patterns.
- Could be replaced with helper functions: `createAndAdd()`, `actionAndNavigate()`.
- Some chains rely on output merging (e.g., `Create` output feeds `AddObject` input).

This is a moderate migration effort (~33 call sites) but follows predictable patterns.

---

### Option 2: Unified Definition with Dual Execution Modes

**Approach**: Create a unified definition format that can be executed as either an intent or a function.

```typescript
const MyOperation = defineOperation({
  id: 'dxos.org/operation/my-op',
  name: 'My Operation',
  inputSchema: Schema.Struct({ value: Schema.Number }),
  outputSchema: Schema.Struct({ result: Schema.String }),
  services: [Database.Service],
  
  // Single implementation
  resolve: ({ data, services }) => Effect.gen(function* () {
    const db = yield* services.Database;
    return { result: data.value.toString() };
  }),
  
  // Optional intent-specific behavior
  intent: {
    undoable: (input, output) => ({
      message: 'Operation performed',
      data: { original: input.value },
    }),
  },
  
  // Optional function-specific behavior
  function: {
    triggers: ['queue', 'timer'],
  },
});

// Usage as intent
dispatch(createIntent(MyOperation, { value: 1 }));

// Usage as function
FunctionInvocationService.invokeFunction(MyOperation.asFunction(), { value: 1 });
```

**Benefits:**
- Single source of truth for operation definitions.
- Gradual migration path.
- Clear separation between execution contexts.

**Drawbacks:**
- Complex unified type system.
- May be over-abstraction if use cases don't actually overlap.
- Different service access patterns still need bridging.

---

### Option 3: Effect-First Architecture (Recommended)

**Approach**: Rebuild both systems on a common Effect foundation, making sync/async execution a configuration choice.

**Core Abstraction:**

```typescript
// Core operation type - agnostic to sync/async
type Operation<I, O, R> = {
  readonly _tag: string;
  readonly inputSchema: Schema.Schema<I>;
  readonly outputSchema: Schema.Schema<O>;
  readonly execute: (input: I) => Effect.Effect<O, Error, R>;
};

// Create operations
const defineOperation = <I, O, R>(props: {
  tag: string;
  input: Schema.Schema<I>;
  output: Schema.Schema<O>;
  execute: (input: I) => Effect.Effect<O, Error, R>;
}): Operation<I, O, R> => ({
  _tag: props.tag,
  inputSchema: props.input,
  outputSchema: props.output,
  execute: props.execute,
});
```

**Runtime Layer:**

```typescript
// App-framework layer (intents)
interface OperationDispatcher {
  dispatch: <I, O, R>(
    op: Operation<I, O, R>,
    input: I,
  ) => Effect.Effect<O, Error, R | IntentServices>;
}

// Functions layer
interface FunctionExecutor {
  invoke: <I, O, R>(
    op: Operation<I, O, R>,
    input: I,
  ) => Effect.Effect<O, Error, R | FunctionServices>;
}
```

**Sync/Async Execution:**

```typescript
// Effect provides sync execution when possible
const syncResult = Effect.runSync(
  operation.execute(input).pipe(
    Effect.provide(SyncCompatibleServices),
  ),
);

// Async execution for operations requiring async services
const asyncResult = await Effect.runPromise(
  operation.execute(input).pipe(
    Effect.provide(AsyncServices),
  ),
);
```

**Intent-Specific Extensions:**

```typescript
// Intent metadata
interface IntentOperation<I, O, R> extends Operation<I, O, R> {
  readonly undoable?: (input: I, output: O) => UndoData | undefined;
  readonly position?: Position;
  readonly filter?: (input: I) => boolean;
}

// Composition via Effect
const composed = Effect.gen(function* () {
  const a = yield* dispatch(OpA, { value: 1 });
  const b = yield* dispatch(OpB, { input: a.output });
  return b;
});
```

**Function-Specific Extensions:**

```typescript
interface FunctionOperation<I, O, R> extends Operation<I, O, R> {
  readonly triggers?: TriggerSpec[];
  readonly deployedId?: string;
}
```

**Benefits:**
- True sync/async agnosticism via Effect.
- Effect.runSync for operations that don't require async.
- Unified service injection via Effect layers.
- First-class composition via Effect generators.
- Interruptible, retryable, observable operations.
- Gradual migration path.

**Drawbacks:**
- Requires deeper Effect knowledge throughout codebase.
- Larger refactoring effort.
- Need to ensure current resolver patterns translate cleanly.

---

### Option 4: Intent as Function Trigger

**Approach**: Make intents a special type of function trigger, unifying the invocation path.

```typescript
// Intent becomes a trigger type
const trigger: Trigger.IntentSpec = {
  kind: 'intent',
  tag: 'dxos.org/plugin/space/action/create',
};

// Function handles intent
defineFunction({
  key: 'space-create-handler',
  inputSchema: SpaceForm,
  outputSchema: SpaceCreateResult,
  handler: async ({ data }) => {
    // Implementation
  },
});
```

**Benefits:**
- Intents become declarative triggers.
- Functions handle all compute.
- Clear separation of "what" (intent) from "how" (function).

**Drawbacks:**
- Intent-specific features (undo, chaining) need reimplementation.
- May over-complicate simple UI operations.
- Remote execution overhead for local-only operations.

---

## Option 5: Keep Separate with Shared Foundation

**Approach**: Maintain intents and functions as separate systems, but extract a shared Effect-based foundation.

```typescript
// Shared foundation
interface EffectHandler<I, O, R> {
  inputSchema: Schema.Schema<I>;
  outputSchema: Schema.Schema<O>;
  execute: (input: I) => Effect.Effect<O, Error, R>;
}

// Intent uses shared foundation
const intentResolver = createResolver({
  intent: MyAction,
  resolve: (data, undo) => 
    handler.execute(data).pipe(
      Effect.map(result => ({
        data: result,
        undoable: { message: 'Done', data },
      })),
    ),
});

// Function uses same handler
defineFunction({
  key: 'my-function',
  inputSchema: handler.inputSchema,
  outputSchema: handler.outputSchema,
  handler: ({ data }) => handler.execute(data),
});
```

**Benefits:**
- Minimal disruption to existing patterns.
- Shared business logic, different execution contexts.
- Clear ownership: intents for UI, functions for background.

**Drawbacks:**
- Doesn't address chaining complexity.
- Duplication of definition boilerplate.
- Sync execution still requires Effect throughout.

---

## Recommendation

**Primary: Option 3 (Effect-First Architecture) with Option 1 (Remove Chaining) as Phase 1.**

### Phased Implementation

**Phase 1: Remove Chaining (Low risk, immediate simplification)**

1. Audit existing chain usages (minimal).
2. Replace chain patterns with explicit Effect composition.
3. Simplify `createIntent()` to return single intent.
4. Update dispatcher to handle single intents.

**Phase 2: Unified Operation Type**

1. Define core `Operation` interface.
2. Create `defineOperation()` that produces both intent and function compatible outputs.
3. Bridge existing resolvers/handlers to new type.

**Phase 3: Effect-First Services**

1. Unify service access patterns via Effect layers.
2. Create bridges between `PluginContext` capabilities and Effect services.
3. Enable sync execution path for operations without async requirements.

**Phase 4: Unified Dispatcher**

1. Create unified dispatch mechanism.
2. Intent dispatcher delegates to unified dispatcher with intent-specific middleware.
3. Function executor delegates to unified dispatcher with function-specific middleware.

---

## Decision Matrix

| Criterion | Option 1 | Option 2 | Option 3 | Option 4 | Option 5 |
|-----------|----------|----------|----------|----------|----------|
| **Migration Effort** | Low | Medium | High | High | Low |
| **API Simplification** | Moderate | High | High | Moderate | Low |
| **Sync Support** | No | Partial | Full | No | Partial |
| **Type Safety** | Same | Improved | Improved | Same | Same |
| **Breaking Changes** | ~33 sites | Moderate | Extensive | Extensive | None |
| **Long-term Value** | Low | Medium | High | Medium | Low |

---

## Synchronous Execution Considerations

Effect-TS provides native sync execution via `Effect.runSync`. However, this only works if:

1. No async services are used in the effect.
2. No `Effect.promise`, `Effect.async`, or similar constructs are used.

**Strategy for Sync Support:**

```typescript
// Mark operations as sync-capable
interface Operation<I, O, R> {
  // ... existing fields
  readonly syncCapable: boolean;
}

// Runtime chooses execution mode
const execute = <I, O, R>(op: Operation<I, O, R>, input: I): O | Promise<O> => {
  const effect = op.execute(input).pipe(Effect.provide(services));
  
  if (op.syncCapable) {
    try {
      return Effect.runSync(effect);
    } catch (e) {
      if (e instanceof AsyncError) {
        // Fallback to async
        return Effect.runPromise(effect);
      }
      throw e;
    }
  }
  
  return Effect.runPromise(effect);
};
```

**Sync-Compatible Service Layer:**

```typescript
// Sync version of common services
const SyncDatabaseService = Layer.succeed(Database.Service, {
  // Only sync operations
  get: (id) => Effect.sync(() => cache.get(id)),
  // Async operations fail in sync context
  query: () => Effect.fail(new AsyncRequiredError()),
});
```

**Practical Sync/Async Classification:**

Based on current intent patterns, here's how operations would classify:

| Operation Type | Sync Viable | Reason |
|----------------|-------------|--------|
| Layout updates | ✅ Yes | Just state mutations |
| Dialog open/close | ✅ Yes | State mutations |
| Toast display | ✅ Yes | State mutations |
| Space create | ❌ No | Network/crypto operations |
| Object add | ⚠️ Maybe | Depends on validation needs |
| Schema operations | ❌ No | Registry queries |
| Share/Invite | ❌ No | Network operations |

**Effect-Based Pattern for Dual Mode:**

```typescript
// Operation definition with sync hint
const UpdateLayoutMode = defineOperation({
  tag: 'LayoutAction.SetLayoutMode',
  input: Schema.Struct({ mode: Schema.String }),
  output: Schema.Void,
  syncHint: true, // Indicates no async services required
  execute: (data) => Effect.gen(function* () {
    const state = yield* LayoutState;
    state.mode = data.mode;
  }),
});

// Dispatcher chooses execution mode
const dispatchAuto = <I, O, R>(op: Operation<I, O, R>, input: I) => {
  const effect = op.execute(input).pipe(Effect.provide(services));
  
  // Try sync first if hinted
  if (op.syncHint) {
    const exit = Effect.runSyncExit(effect);
    if (Exit.isSuccess(exit)) {
      return exit.value;
    }
    // Fall through to async if sync failed
  }
  
  return Effect.runPromise(effect);
};
```

---

## Migration Examples

### Current Intent Pattern

```typescript
// Definition
class Compute extends Schema.TaggedClass<Compute>()('Compute', {
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Struct({ value: Schema.Number }),
}) {}

// Resolver
createResolver({
  intent: Compute,
  resolve: (data, undo) => {
    if (undo) {
      return { data: { value: data.value / 2 } };
    }
    return {
      data: { value: data.value * 2 },
      undoable: { message: 'Computed', data: { value: data.value * 2 } },
    };
  },
});

// Dispatch
const result = await dispatchPromise(createIntent(Compute, { value: 1 }));
```

### Unified Pattern (Effect-First)

```typescript
// Definition
const Compute = defineOperation({
  tag: 'Compute',
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Struct({ value: Schema.Number }),
  execute: (data) => Effect.succeed({ value: data.value * 2 }),
});

// Intent extension for undo
const ComputeIntent = extendAsIntent(Compute, {
  undoable: (input, output) => ({
    message: 'Computed',
    data: { value: output.value },
  }),
  undo: (data) => Effect.succeed({ value: data.value / 2 }),
});

// Dispatch (Effect-native)
const result = yield* dispatch(ComputeIntent, { value: 1 });

// Or sync if possible
const syncResult = dispatchSync(Compute, { value: 1 }); // throws if async required
```

---

## Appendix: Current Architecture Diagrams

### Intent Flow

```
createIntent(Schema, data)
        │
        ▼
   IntentChain { first, last, all[] }
        │
        ▼
   dispatch(chain)
        │
        ▼
   IntentDispatcher
        │
        ├──► getResolvers().filter(tag match)
        │
        ├──► Apply position sorting
        │
        ├──► Apply filter predicates
        │
        ▼
   First matching resolver.resolve(data, undo)
        │
        ├──► Returns { data, undoable?, intents?, error? }
        │
        ├──► Merge data into next intent in chain
        │
        ├──► Dispatch follow-up intents
        │
        ▼
   Update history for undo
        │
        ▼
   Return final data
```

### Function Flow

```
defineFunction(props)
        │
        ▼
   FunctionDefinition { key, schemas, handler }
        │
        ├──► Serialize to Function (ECHO object)
        │
        ├──► Deploy to edge runtime
        │
        ▼
   Trigger fires (timer/queue/subscription)
        │
        ▼
   TriggerDispatcher.invokeTrigger()
        │
        ▼
   FunctionInvocationService.invokeFunction()
        │
        ├──► Check deployedFunctionId
        │    ├──► Remote: RemoteFunctionExecutionService
        │    └──► Local: LocalFunctionExecutionService
        │
        ▼
   Validate input schema
        │
        ▼
   Create FunctionContext with services
        │
        ▼
   handler({ context, data })
        │
        ├──► Effect.provide(servicesLayer)
        │
        ▼
   Validate output schema
        │
        ▼
   Return result
```

---

## Conclusion

The Intent and Function systems serve related but distinct purposes. Intents excel at UI orchestration with features like undo and follow-up actions, while Functions excel at background compute with deployment and trigger capabilities.

**Recommended Path Forward:**

1. **Short-term (Option 1)**: Remove chaining from intents to simplify the API. Replace with explicit Effect composition. This is a moderate migration (~33 sites) but follows predictable patterns.

2. **Medium-term (Option 3 foundation)**: Establish shared Effect-based primitives that both systems can build on. This enables sync execution where possible and provides a unified mental model.

3. **Long-term (Option 3 full)**: If usage patterns converge, move toward full unification with a single `Operation` type that can be extended for intent or function-specific behaviors.

**Key Insight**: The current systems aren't fundamentally incompatible—they're optimized for different execution contexts. Unification should focus on shared foundations (Effect, schemas, service injection) rather than forcing a single abstraction that compromises either use case.
