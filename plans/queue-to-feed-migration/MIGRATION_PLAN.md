# Migration Plan: QueueService → Feed.FeedService

## Status

**Phase 1 COMPLETE**: Renamed `Feed.Service` → `Feed.FeedService` and updated all references across the codebase.

**Remaining Work**: The actual migration of operation handlers from `QueueService` to `Feed.FeedService` API is a larger undertaking that requires:
1. Refactoring code that uses `QueueService.getQueue()` to use `Feed.query()` and `Feed.append()` instead
2. Updating trigger dispatcher to work with Feed objects instead of queue DXNs
3. Updating conversation/session code to use Feed API

The `feedServiceFromQueueServiceLayer` escape hatch remains available for gradual migration.

## Overview

This plan describes the migration from `QueueService` (deprecated) to `Feed.FeedService` (new API).

### Key Differences

| Aspect | QueueService | Feed.FeedService |
|--------|--------------|------------------|
| Tag Key | `@dxos/functions/QueueService` | `@dxos/echo/Feed/Service` |
| Location | `@dxos/functions` | `@dxos/echo` |
| API Style | Imperative (get queue, then call methods) | Effect-based (operations on Feed objects) |
| Queue Access | `QueueService.getQueue(dxn)` → `Queue` | `Feed.query(feed, filter)` → `QueryResult` |
| Create Queue | `QueueService.createQueue()` → `Queue` | `Database.add(Feed.make())` → `Feed` |
| Append | `queue.append(items)` | `Feed.append(feed, items)` |
| Delete | `queue.delete(ids)` | `Feed.remove(feed, items)` |
| Query | `queue.queryObjects()` | `Feed.runQuery(feed, filter)` |

### Naming Convention

The issue requests renaming `Feed.Service` → `Feed.FeedService`. This is noted in the code with a TODO comment:
```ts
// TODO(dmaretskyi): Rename to FeedService so it shows up as "FeedService" in the TypeScript hovers instead of just "Service".
```

## Migration Steps

### Step 1: Rename Feed.Service → Feed.FeedService

**File:** `/workspace/packages/core/echo/echo/src/Feed.ts`

Change:
```ts
export class Service extends Context.Tag('@dxos/echo/Feed/Service')<...>() {}
```
To:
```ts
export class FeedService extends Context.Tag('@dxos/echo/Feed/FeedService')<...>() {}
```

Also update:
- `notAvailable` layer reference
- All operations that reference `Service` → `FeedService`

### Step 2: Update All Feed.Service References

Update imports and usages across the codebase:
- `Feed.Service` → `Feed.FeedService`

**Files to update:**
1. `/workspace/packages/core/echo/echo-db/src/queue/feed-service.ts` - Creates Feed.Service layer
2. `/workspace/packages/plugins/plugin-automation/src/capabilities/compute-runtime.ts` - Uses Feed.Service
3. `/workspace/packages/core/functions/src/protocol/protocol.ts` - References Feed.Service
4. `/workspace/packages/core/functions-runtime/src/services/service-container.ts` - SERVICES mapping
5. `/workspace/packages/core/functions-runtime/src/testing/layer.ts` - Test layer
6. `/workspace/packages/core/assistant/src/testing/layer.ts` - Test layer
7. `/workspace/packages/plugins/plugin-inbox/src/operations/definitions.ts` - Operation services
8. `/workspace/packages/plugins/plugin-youtube/src/operations/definitions.ts` - Operation services
9. `/workspace/packages/core/conductor/src/compiler/fiber-compiler.ts` - Compiler services
10. `/workspace/packages/ui/react-ui-canvas-compute/src/graph/controller.ts` - Graph controller

### Step 3: Migrate Operation Definitions

Operations that currently declare `QueueService` in their `services` array need to be migrated to use `Feed.FeedService`.

#### 3.1 plugin-inbox Operations

**File:** `/workspace/packages/plugins/plugin-inbox/src/operations/definitions.ts`
- Change `services: [Database.Service, QueueService]` → `services: [Database.Service, Feed.FeedService]`

**File:** `/workspace/packages/plugins/plugin-inbox/src/operations/classify-email.ts`
- Replace `QueueService.getQueue(dxn)` with `Feed.query(feed, filter)` pattern
- Replace `QueueService.append()` with `Feed.append()`

#### 3.2 plugin-transcription Operations

**File:** `/workspace/packages/plugins/plugin-transcription/src/operations/definitions.ts`
- Change `services: [Database.Service, QueueService]` → `services: [Database.Service, Feed.FeedService]`

**File:** `/workspace/packages/plugins/plugin-transcription/src/operations/open.ts`
- Replace `QueueService.getQueue(dxn)` with Feed API

#### 3.3 plugin-script Blueprint Functions

**File:** `/workspace/packages/plugins/plugin-script/src/blueprints/functions/definitions.ts`
- Change `services: [Database.Service, QueueService]` → `services: [Database.Service, Feed.FeedService]`

**File:** `/workspace/packages/plugins/plugin-script/src/blueprints/functions/inspect-invocations.ts`
- Replace `QueueService.getQueue()` with Feed API

### Step 4: Migrate Trigger Dispatcher

**File:** `/workspace/packages/core/functions-runtime/src/triggers/trigger-dispatcher.ts`

The trigger dispatcher uses `QueueService.getQueue()` for queue triggers. Migration approach:

```ts
// Before
const queue = yield* QueueService.getQueue(DXN.parse(spec.queue));
const objects = yield* Effect.promise(() => queue.queryObjects());

// After - Need to load the Feed object first
// Option 1: Store Feed reference in trigger spec
// Option 2: Query Feed by queue DXN
```

**Question:** How should queue triggers reference feeds? Currently they store a queue DXN string. Options:
1. Store a `Ref<Feed>` instead of queue DXN
2. Add a lookup mechanism to find Feed by queue DXN
3. Keep `feedServiceFromQueueServiceLayer` as escape hatch for triggers

### Step 5: Migrate Conversation/Session Code

#### 5.1 AiConversation

**File:** `/workspace/packages/core/assistant/src/conversation/conversation.ts`

```ts
// Before
static layerNewQueue = (): Layer.Layer<..., QueueService> =>
  Layer.unwrapScoped(
    Effect.gen(function* () {
      return AiConversationService.layer({
        queue: yield* QueueService.createQueue<Message | ContextBinding>(),
      });
    }),
  );

// After - Create a Feed object instead
static layerNewFeed = (): Layer.Layer<..., Database.Service | Feed.FeedService> =>
  Layer.unwrapScoped(
    Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      // AiConversation needs to be refactored to work with Feed instead of Queue
      ...
    }),
  );
```

**Note:** `AiConversation` internally uses `Queue` type from echo-db. This is a deeper refactor.

#### 5.2 AgentService

**File:** `/workspace/packages/core/assistant/src/service/AgentService.ts`

Multiple usages of `QueueService.getQueue()`:
- `createSession`: Gets queue from feed DXN
- `addContext`: Gets queue from feed DXN  
- `getContext`: Gets queue from feed DXN

**Migration approach:** Since these already use `Feed.getQueueDxn(feed)` to get the DXN, they can be migrated to use `Feed.query()` and `Feed.append()` directly.

#### 5.3 agent-process

**File:** `/workspace/packages/core/assistant/src/service/agent-process.ts`

Uses `QueueService` to get queue from feed DXN for messages.

### Step 6: Migrate assistant-toolkit

#### 6.1 Project Types

**File:** `/workspace/packages/core/assistant-toolkit/src/types/Project.ts`

Uses `QueueService.getQueue()` and `QueueService.createQueue()` for chat feeds and input queues.

#### 6.2 Blueprint Functions

**Files:**
- `/workspace/packages/core/assistant-toolkit/src/blueprints/project/functions/definitions.ts`
- `/workspace/packages/core/assistant-toolkit/src/blueprints/project/functions/agent.ts`
- `/workspace/packages/core/assistant-toolkit/src/blueprints/project-wizard/functions/definitions.ts`
- `/workspace/packages/core/assistant-toolkit/src/blueprints/research/types/ResearchGraph.ts`

All use `QueueService` in services array and/or implementation.

#### 6.3 Agent Functions

**Files:**
- `/workspace/packages/core/assistant-toolkit/src/functions/agent/definitions.ts`
- `/workspace/packages/core/assistant-toolkit/src/functions/agent/prompt.ts`
- `/workspace/packages/core/assistant-toolkit/src/functions/entity-extraction/definitions.ts`

### Step 7: Migrate plugin-assistant

**Files:**
- `/workspace/packages/plugins/plugin-assistant/src/processor/processor.ts`
- `/workspace/packages/plugins/plugin-assistant/src/processor/processor.test.ts`

### Step 8: Update Runtime/Protocol Layers

#### 8.1 Service Container

**File:** `/workspace/packages/core/functions-runtime/src/services/service-container.ts`

Update SERVICES mapping:
```ts
const SERVICES = {
  // ...
  feeds: Feed.FeedService,  // was Feed.Service
  // ...
};
```

#### 8.2 Compute Runtime

**File:** `/workspace/packages/plugins/plugin-automation/src/capabilities/compute-runtime.ts`

Already provides both `QueueService` and `Feed.Service`. Migration:
1. Keep `feedServiceFromQueueServiceLayer` as escape hatch during transition
2. Eventually remove `QueueService` from `ServiceResolver.layerRequirements()`

### Step 9: Update Tests

**Files:**
- `/workspace/packages/core/echo/echo-db/src/queue/feed.test.ts`
- `/workspace/packages/core/functions-runtime/src/triggers/trigger-dispatcher.test.ts`
- `/workspace/packages/core/assistant-toolkit/src/blueprints/project/blueprint.test.ts`
- `/workspace/packages/core/assistant-toolkit/src/blueprints/planning-old/blueprint.test.ts`
- `/workspace/packages/core/assistant-toolkit/src/blueprints/design/blueprint.test.ts`
- `/workspace/packages/core/assistant-toolkit/src/functions/agent/prompt.test.ts`
- `/workspace/packages/plugins/plugin-assistant/src/processor/processor.test.ts`

## Questions / Clarifications Needed

1. **Trigger Queue References:** Queue triggers currently store a queue DXN string in `spec.queue`. Should this be changed to store a `Ref<Feed>` instead? This would require a schema migration.

2. **AiConversation Queue Dependency:** `AiConversation` takes a `Queue` object directly in its constructor. Should this be changed to take a `Feed` object, or should we keep the internal Queue abstraction?

3. **ContextQueueService:** There's also a `ContextQueueService` that provides a specific queue as context. Should this be migrated to a `ContextFeedService`?

4. **Backward Compatibility:** Should we keep `QueueService` available (deprecated) for a transition period, or remove it entirely?

5. **Queue vs Feed Semantics:** The `Queue` type has methods like `sync()`, `refresh()`, `subscribe()` that aren't directly available on Feed. Are these needed for any of the migrated code paths?

## Escape Hatch

The `feedServiceFromQueueServiceLayer` in `/workspace/packages/core/functions/src/services/queues.ts` provides a bridge:

```ts
export const feedServiceFromQueueServiceLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { queues } = yield* QueueService;
    return createFeedServiceLayer(queues);
  }),
);
```

This can be used during migration to provide `Feed.FeedService` from an existing `QueueService`.

## Recommended Migration Order

1. **Phase 1 - Rename:** Rename `Feed.Service` → `Feed.FeedService` and update all references
2. **Phase 2 - Operations:** Migrate operation definitions to use `Feed.FeedService`
3. **Phase 3 - Handlers:** Migrate operation handlers to use Feed API
4. **Phase 4 - Conversation:** Migrate conversation/session code
5. **Phase 5 - Triggers:** Migrate trigger dispatcher (may need schema changes)
6. **Phase 6 - Cleanup:** Remove `QueueService` from service requirements where possible
