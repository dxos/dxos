---
name: Function to Operation Migration
overview: Phased migration plan to replace the Functions API with the Operations API, enabling unified local/remote operation invocation while preserving the ECHO types, services, and deployment infrastructure.
todos:
  - id: followup-scheduler
    content: Add FollowupScheduler service for tracked background operations
    status: completed
  - id: extend-operation-def
    content: Add types, services, deployedId; make executionMode required with default
    status: completed
    dependencies:
      - followup-scheduler
  - id: handler-context
    content: Create OperationContext service and adapter for FunctionHandler
    status: pending
    dependencies:
      - extend-operation-def
  - id: function-bridge
    content: Create operationToFunction/functionToOperation serialization helpers
    status: pending
    dependencies:
      - handler-context
  - id: deployment-bridge
    content: Extend FunctionsServiceClient to deploy OperationDefinition
    status: pending
    dependencies:
      - function-bridge
  - id: trigger-integration
    content: Update TriggerDispatcher to route to local OperationResolvers
    status: pending
    dependencies:
      - deployment-bridge
  - id: deprecate-functions
    content: Deprecate defineFunction and migrate remaining usage
    status: pending
    dependencies:
      - trigger-integration
---

# Function to Operation Migration Plan

## Current Gap Analysis

`defineFunction` has capabilities that `Operation.make` and `OperationResolver.make` lack:| Feature | defineFunction | Operation.make | Required for Parity ||---------|---------------|----------------|---------------------|| ECHO Types (`types[]`) | Yes | No | Yes - runtime type availability || Effect Services (`services[]`) | Yes | No | Yes - dependency injection || Handler signature | `{ context, data }` | `input` | Adapter needed || Stack trace capture | Yes | No | Nice to have || Automatic span wrapping | Yes | No | Nice to have || Serialization to ECHO | `Function.Function` | None | Yes - deployment & triggers || Type symbol (`typeId`) | Yes | No | Yes - runtime checks || Deployment metadata | `meta.deployedFunctionId` | None | Yes - remote invocation |---

## Phase 0: Followup Operation Scheduling

**Goal:** Introduce a mechanism for operation handlers to schedule followup operations that:

1. Run after the main operation returns
2. Aren't cancelled when the parent operation's fiber completes
3. Are tracked by the dispatcher to prevent leaks and enable monitoring

**Problem:** Currently, if a handler wants to trigger background work, it must either:

- `yield* invoke(...)` - blocks until complete
- `Effect.forkDaemon(invoke(...))` - fire-and-forget, untracked, errors are lost

**Solution:** Add a `FollowupScheduler` service that handlers can use to schedule tracked background operations.**Implementation in [`packages/sdk/app-framework/src/plugin-operation/invoker`](packages/sdk/app-framework/src/plugin-operation/invoker):**

```typescript
import * as Fiber from 'effect/Fiber';
import * as FiberSet from 'effect/FiberSet';

// Service for scheduling followup operations
export class FollowupScheduler extends Context.Tag('@dxos/operation/FollowupScheduler')<
  FollowupScheduler,
  {
    /**
    * Schedule an operation to run after the current operation completes.
    * The followup is tracked and won't be cancelled when the parent completes.
     */
    schedule: <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<void>;
    
    /**
    * Schedule an arbitrary effect as a followup.
     */
    scheduleEffect: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<void>;
  }
>() {}

// Extended OperationInvoker that provides followup tracking
class OperationInvokerImpl implements OperationInvoker {
  // Track all followup fibers
  private readonly _followups: FiberSet.FiberSet<unknown, unknown>;
  
  constructor(...) {
    this._followups = Effect.runSync(FiberSet.make<unknown, unknown>());
  }
  
  // Provide FollowupScheduler to handlers during invocation
  _invokeCore = <I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> => {
    return Effect.gen(this, function* () {
      const handler = yield* this._resolveHandler(op, input);
      if (!handler) {
        return yield* Effect.fail(new NoHandlerError(op.meta.key));
      }

      // Create scheduler that adds to tracked fiber set
      const scheduler: FollowupScheduler = {
        schedule: (followupOp, followupInput) =>
          Effect.gen(this, function* () {
            const fiber = yield* Effect.fork(this.invoke(followupOp, followupInput));
            yield* FiberSet.add(this._followups, fiber);
          }),
        scheduleEffect: (effect) =>
          Effect.gen(this, function* () {
            const fiber = yield* Effect.fork(effect);
            yield* FiberSet.add(this._followups, fiber);
          }),
      };

      // Run handler with scheduler available
      const output = yield* handler(input).pipe(
        Effect.provideService(FollowupScheduler, scheduler),
      );

      return output;
    });
  };
  
  // Expose for monitoring/cleanup
  get pendingFollowups(): Effect.Effect<number> {
    return FiberSet.size(this._followups);
  }
}
```

**Usage in handlers:**

```typescript
OperationResolver.make({
  operation: ThreadOperation.Delete,
  handler: (input) =>
    Effect.gen(function* () {
      const scheduler = yield* FollowupScheduler;
      
      // Main operation logic
      db.remove(thread);
      
      // Schedule analytics event as followup (doesn't block return)
      yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
        name: 'threads.delete',
        properties: { threadId: thread.id },
      });
      
      return { thread, anchor };
    }),
});
```

**Benefits:**

- Followups don't block the main operation's return
- Followups aren't cancelled when the parent fiber completes
- All followups are tracked - no fire-and-forget leaks
- Errors in followups can be logged/monitored
- Dispatcher can wait for all followups to complete during shutdown

---

## Phase 1: Extend OperationDefinition for Function Parity

**Goal:** Add missing fields to `OperationDefinition` so it can express everything a `FunctionDefinition` can.**Changes to [`packages/core/operation/src/operation.ts`](packages/core/operation/src/operation.ts):**

```typescript
// The canonical definition type - executionMode is REQUIRED here
export interface OperationDefinition<I, O> extends Pipeable.Pipeable {
  readonly schema: {
    readonly input: OperationSchema<I>;
    readonly output: OperationSchema<O>;
  };
  readonly meta: {
    readonly key: string;
    readonly name?: string;
    readonly description?: string;
    // NEW: Deployment ID for remote invocation
    readonly deployedId?: string;
  };
  // CHANGED: Now required in the type (always present after make())
  readonly executionMode: 'sync' | 'async';
  
  // NEW: ECHO types the operation uses (for runtime availability)
  readonly types?: readonly Type.Entity.Any[];
  
  // NEW: Required Effect services (actual Context.Tag instances, not just keys)
  // These services will be automatically provided to handlers at invocation time.
  readonly services?: readonly Context.Tag<any, any>[];
}

// Props derived from OperationDefinition - makes executionMode optional
export type OperationProps<I, O> = Omit<OperationDefinition<I, O>, 'pipe' | 'executionMode'> & {
  readonly executionMode?: 'sync' | 'async';
};

// Factory applies the default
export const make = <I, O>(props: OperationProps<I, O>): OperationDefinition<I, O> => {
  return {
    ...props,
    executionMode: props.executionMode ?? 'async',
    pipe() {
      return Pipeable.pipeArguments(this, arguments);
    },
  };
};
```

**Reasoning:**

- `types` enables ECHO type declaration for runtime availability
- `services` stores actual `Context.Tag` instances (not just string keys) so the invoker can provide them to handlers
- `deployedId` in meta enables remote invocation routing
- `executionMode` is required in the type but optional in props (defaults to 'async')
- These are optional fields, so existing Operation usage remains compatible

**Note:** For serialization (Phase 3), keys can be extracted from the tags via `tag.key`.

---

## Phase 2: Unified Handler Signature & Service Provision

**Goal:** Align handler signatures so Operations can receive the same context as Functions, and automatically provide declared services to handlers.

**Current signatures:**

- Function: `({ context, data }) => Effect<O>`
- Operation: `(input) => Effect<O>`

**Strategy:** Keep Operation's simpler signature but provide context and services via Effect services.

### Service Provision

Update `OperationInvoker` to accept a service context and provide declared services to handlers:

```typescript
// Extend OperationInvoker.make to accept a service context getter
export const make = (
  getHandlers: () => Effect.Effect<OperationResolver[], Error>,
  getServiceContext?: () => Context.Context<any>, // NEW: Optional service context
): OperationInvoker => { ... };

// In _invokeCore, provide declared services from the context
_invokeCore = <I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O, Error> => {
  return Effect.gen(this, function* () {
    const handler = yield* this._resolveHandler(op, input);
    
    // Provide FollowupScheduler (always)
    let effect = handler(input).pipe(
      Effect.provideService(FollowupScheduler.Service, this._followupScheduler),
    );
    
    // Provide declared services from the operation definition
    if (op.services && this._getServiceContext) {
      const ctx = this._getServiceContext();
      for (const tag of op.services) {
        effect = effect.pipe(Effect.provideService(tag, Context.get(ctx, tag)));
      }
    }
    
    return yield* effect;
  });
};
```

### Optional FunctionContext Adapter

```typescript
// The FunctionContext becomes an optional service
export class OperationContext extends Context.Tag('@dxos/operation/Context')<
  OperationContext,
  { /* context fields */ }
>() {}

// Handlers access context via Effect
const handler = (input: I) => Effect.gen(function* () {
  const ctx = yield* Effect.serviceOption(OperationContext);
  // ... use input and optional ctx
});
```

**Adapter for existing Functions:**

```typescript
// In @dxos/functions sdk.ts - adapter wrapper
export const functionToOperationHandler = <I, O>(
  fnHandler: FunctionHandler<I, O>
): OperationHandler<I, O> => {
  return (input) => Effect.gen(function* () {
    const context = yield* Effect.serviceOption(OperationContext).pipe(
      Effect.map(Option.getOrElse(() => ({} as FunctionContext)))
    );
    return yield* fnHandler({ context, data: input });
  });
};
```

---

## Phase 3: Operation to Function.Function Serialization

**Goal:** Enable persisting `OperationDefinition` using the existing `Function.Function` ECHO schema. No new schema needed.**Approach:** Reuse `Function.Function` for backward compatibility with existing triggers, deployments, and EDGE infrastructure. The EDGE service already understands this format.**Add serialize/deserialize helpers in [`packages/core/operation`](packages/core/operation) or [`packages/core/functions`](packages/core/functions):**

```typescript
// Serialize Operation → Function.Function (for persistence/deployment)
export const operationToFunction = (op: OperationDefinition.Any): Function.Function => {
  return Function.make({
    key: op.meta.key,
    name: op.meta.name ?? op.meta.key,
    version: '0.1.0',
    description: op.meta.description,
    inputSchema: Type.toJsonSchema(op.schema.input),
    outputSchema: Type.toJsonSchema(op.schema.output),
    services: op.services,
  });
};

// Deserialize Function.Function → OperationDefinition (for runtime use)
export const functionToOperation = (fn: Function.Function): OperationDefinition.Any => {
  return Operation.make({
    meta: {
      key: fn.key ?? fn.name,
      name: fn.name,
      description: fn.description,
      deployedId: getUserFunctionIdInMetadata(Obj.getMeta(fn)),
    },
    schema: {
      input: fn.inputSchema ? Type.toEffectSchema(fn.inputSchema) : Schema.Unknown,
      output: fn.outputSchema ? Type.toEffectSchema(fn.outputSchema) : Schema.Unknown,
    },
    services: fn.services,
  });
};
```

**Rationale:** Creating a new `Operation.Operation` ECHO schema would require:

- Migrating existing trigger references
- Updating EDGE deployment infrastructure
- Maintaining two parallel persistence formats

This can be deferred to Phase 6 if/when we want to fully retire the Function concept.---

## Phase 4: Operation Deployment Bridge

**Goal:** Deploy Operations to EDGE using existing function infrastructure.**Key insight:** The EDGE service doesn't care about the local API - it just receives bundled JavaScript. The mapping is at build/deploy time.**Implementation:**

1. **Bundler updates** in [`packages/core/functions-runtime/src/bundler`](packages/core/functions-runtime/src/bundler):

- Accept `OperationDefinition` as input (detect via type check)
- Generate wrapper code that adapts to existing EDGE entrypoint format

2. **FunctionsServiceClient extension** in [`packages/core/functions-runtime/src/edge/functions-service-client.ts`](packages/core/functions-runtime/src/edge/functions-service-client.ts):
   ```typescript
            async deployOperation(op: OperationDefinition.Any): Promise<Operation.Operation> {
              // 1. Serialize operation metadata
              // 2. Bundle operation code with adapter shim
              // 3. Upload to EDGE via existing uploadFunction
              // 4. Return ECHO object with deployedId in meta
            }
   ```




3. **Invocation routing** - extend `RemoteFunctionExecutionService` or create `RemoteOperationExecutionService`:
   ```typescript
            callOperation<I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<O> {
              const deployedId = op.meta.deployedId;
              if (!deployedId) {
                return Effect.fail(new Error('Operation not deployed'));
              }
              return this.callFunction(deployedId, input);
            }
   ```


---

## Phase 5: Trigger System Integration

**Goal:** Ensure triggers work seamlessly with Operations via the Function.Function bridge.Since triggers already reference `Function.Function` objects, and Operations serialize to `Function.Function`, no schema changes are needed.**TriggerDispatcher updates** in [`packages/core/functions-runtime/src/triggers/trigger-dispatcher.ts`](packages/core/functions-runtime/src/triggers/trigger-dispatcher.ts):

- When resolving a trigger's function reference, check if there's a registered `OperationResolver` for that key
- If local resolver exists, invoke via `OperationInvoker` instead of `FunctionInvocationService`
- If no local resolver, fall back to remote invocation (existing behavior)

This enables the same trigger to invoke an Operation locally (if a resolver is registered) or remotely (if deployed to EDGE).---

## Phase 6: Deprecate FunctionDefinition

**Goal:** Remove `defineFunction` once all usage migrates to Operations.**Steps:**

1. Add deprecation warnings to `defineFunction`
2. Create codemod to transform `defineFunction` calls to `Operation.make`
3. Update documentation
4. Remove `FunctionDefinition` type and related code

**Optional: Introduce Operation.Operation schema**At this stage, if desired, a dedicated `Operation.Operation` ECHO schema could replace `Function.Function`:

- Rename typename from `dxos.org/type/Function` to `dxos.org/type/Operation`
- Migrate existing data
- Update EDGE service to understand the new schema

This is optional - the Function.Function schema can continue to serve as the persistence format indefinitely.**Migration examples:**

```typescript
// Before
const myFunc = defineFunction({
  key: 'my-func',
  name: 'My Function',
  inputSchema: MyInput,
  outputSchema: MyOutput,
  types: [MyType],
  services: [DatabaseService],
  handler: async ({ context, data }) => { ... }
});

// After
const MyOperation = Operation.make({
  meta: { key: 'my-func', name: 'My Function' },
  schema: { input: MyInput, output: MyOutput },
  types: [MyType],
  services: [DatabaseService.key],
});
// Handler registered separately via OperationResolver
```

---

## Alternative Consideration: Wrapper vs. Replace

Instead of modifying `OperationDefinition` directly, consider:**`DeployableOperation`** - a wrapper type that adds deployment concerns:

```typescript
type DeployableOperation<I, O> = OperationDefinition<I, O> & {
  types: readonly Type.Entity.Any[];
  services: readonly string[];
  deployment?: { id: string; version: string };
};
```

This keeps the core `Operation` lean while adding deployment capabilities as a layer. Similar to how `OperationResolver` adds `position` and `filter` without modifying the core type.---

## Summary of Phases

| Phase | Focus | Outcome ||-------|-------|---------|| 0 | Followup scheduling | FollowupScheduler service for tracked background operations || 1 | Extend OperationDefinition | Add types, services, deployedId fields || 2 | Handler signature | Context via Effect services, adapter for legacy || 3 | Function.Function bridge | Serialize Operations to existing Function schema || 4 | Deployment bridge | Deploy operations to EDGE via existing infrastructure || 5 | Trigger integration | Triggers invoke Operations via local resolvers or remote |