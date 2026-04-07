# Migration Plan: QueueService → Feed.FeedService

## Status

**Phase 1 COMPLETE**: Renamed `Feed.Service` → `Feed.FeedService` and updated all references across the codebase.

## Decisions (from PR review)

Based on feedback from @dmaretskyi:

1. **Trigger Dispatcher**: Do NOT migrate - let it continue using QueueService
2. **Service Container**: Deprecated - updates are fine but not critical
3. **AiConversation**: Should be changed to take a `Feed` object instead of `Queue`
4. **ContextQueueService**: Deprecated - doesn't need migration
5. **QueueService**: Keep available with `@deprecated` JSDoc for backward compatibility
6. **Queue methods (sync/refresh/subscribe)**: If code paths need these, don't migrate those paths

## Overview

This plan describes the migration from `QueueService` (deprecated) to `Feed.FeedService` (new API).

### Key Differences

| Aspect       | QueueService                              | Feed.FeedService                           |
| ------------ | ----------------------------------------- | ------------------------------------------ |
| Tag Key      | `@dxos/functions/QueueService`            | `@dxos/echo/Feed/FeedService`              |
| Location     | `@dxos/functions`                         | `@dxos/echo`                               |
| API Style    | Imperative (get queue, then call methods) | Effect-based (operations on Feed objects)  |
| Queue Access | `QueueService.getQueue(dxn)` → `Queue`    | `Feed.query(feed, filter)` → `QueryResult` |
| Create Queue | `QueueService.createQueue()` → `Queue`    | `Database.add(Feed.make())` → `Feed`       |
| Append       | `queue.append(items)`                     | `Feed.append(feed, items)`                 |
| Delete       | `queue.delete(ids)`                       | `Feed.remove(feed, items)`                 |
| Query        | `queue.queryObjects()`                    | `Feed.runQuery(feed, filter)`              |

## What Was Done (Phase 1)

### Renamed Feed.Service → Feed.FeedService

- `packages/core/echo/echo/src/Feed.ts` - Renamed the Effect service class
- Added deprecated `Service` alias for backward compatibility
- Updated all references across the codebase

### Files Updated

1. `packages/core/echo/echo-db/src/queue/feed-service.ts`
2. `packages/plugins/plugin-automation/src/capabilities/compute-runtime.ts`
3. `packages/plugins/plugin-automation/src/types/capabilities.ts`
4. `packages/core/functions/src/protocol/protocol.ts`
5. `packages/core/functions/src/sdk.ts`
6. `packages/core/functions-runtime/src/services/service-container.ts`
7. `packages/core/functions-runtime/src/services/function-invocation-service.ts`
8. `packages/core/functions-runtime/src/services/local-function-execution.ts`
9. `packages/core/functions-runtime/src/FeedTraceSink.ts`
10. `packages/core/functions-runtime/src/testing/layer.ts`
11. `packages/core/assistant/src/testing/layer.ts`
12. `packages/plugins/plugin-inbox/src/operations/definitions.ts`
13. `packages/plugins/plugin-youtube/src/operations/definitions.ts`
14. `packages/core/conductor/src/compiler/fiber-compiler.ts`
15. `packages/ui/react-ui-canvas-compute/src/graph/controller.ts`
16. `packages/devtools/cli/src/util/runtime.ts`

## Remaining Work (Future Phases)

### Phase 2: Migrate AiConversation to use Feed

**File:** `packages/core/assistant/src/conversation/conversation.ts`

AiConversation currently takes a `Queue` object in its constructor. This should be changed to take a `Feed` object instead.

```ts
// Current
export type AiConversationOptions = {
  queue: Queue<Message.Message | ContextBinding>;
  registry?: Registry.Registry;
};

// Target
export type AiConversationOptions = {
  feed: Feed.Feed;
  registry?: Registry.Registry;
};
```

### Phase 3: Migrate Operation Handlers (selective)

Only migrate handlers that don't need Queue-specific methods (sync/refresh/subscribe).

**Candidates for migration:**

- `packages/plugins/plugin-inbox/src/operations/classify-email.ts`
- `packages/plugins/plugin-transcription/src/operations/open.ts`
- `packages/plugins/plugin-script/src/blueprints/functions/inspect-invocations.ts`

### NOT Migrating

The following should continue using QueueService:

1. **Trigger Dispatcher** (`packages/core/functions-runtime/src/triggers/trigger-dispatcher.ts`)
   - Uses queue DXN strings in trigger specs
   - Complex cursor/position tracking logic

2. **Code paths using Queue methods**: `sync()`, `refresh()`, `subscribe()`

## Escape Hatch

The `feedServiceFromQueueServiceLayer` in `packages/core/functions/src/services/queues.ts` provides a bridge:

```ts
export const feedServiceFromQueueServiceLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const { queues } = yield* QueueService;
    return createFeedServiceLayer(queues);
  }),
);
```

This allows providing `Feed.FeedService` from an existing `QueueService` during the transition period.
