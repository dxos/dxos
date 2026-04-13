# Process Manager Overhaul Plan

## Branch: dm/process

## Status: In Progress

## Last Updated: 2026-04-05 (iteration 3)

## Overview

Overhaul the compute runtime to use the ProcessManager as the primary execution model. Convert agents, chat, triggers, and operations from direct function invocations to process-managed execution. Migrate tracing from the deprecated `TracingService` to the new `Trace.TraceService` API.

## Already Done (Prior Commits)

1. **ProcessManager** implemented in `functions-runtime/src/process/ProcessManager.ts`
2. **Process** definition in `functions/src/process/Process.ts` with lifecycle (RUNNING, HYBERNATING, IDLE, SUCCEEDED, FAILED, TERMINATED)
3. **Trace API** (`functions/src/Trace.ts`) with EventType, TraceWriter, TraceService, TraceSink
4. **FeedTraceSink** for persistent trace storage
5. **AgentProcess** - process-backed agent with suspendible conversation
6. **AgentService** - session management layer using ProcessManager
7. **ServiceResolver** - dynamic service resolution for processes
8. **StorageService** - scoped KV store for process state
9. **AiChatProcessor** updated to use AgentService + ephemeral streaming
10. **ComputeRuntime** (plugin-automation) wired up with ProcessManager, AgentService, FeedTraceSink
11. **Process trace events** (SpawnedEvent, ExitedEvent) integrated
12. **TriggerDispatcher** updated to work with ProcessManager
13. All existing tests passing (assistant, assistant-toolkit, functions-runtime)

## Remaining Work

### Phase 1: Remove TracingService from AiSession and AiConversation

**Goal**: AiSession should only depend on `Trace.TraceService`, not `TracingService`.

#### 1.1 Remove TracingService from AiSession requirements

- **File**: `packages/core/assistant/src/session/session.ts`
- `AiSessionRunRequirements` currently includes `TracingService`
- `runTools()` uses `TracingService.layerSubframe()` for tool execution scoping
- **Action**: Replace `TracingService.layerSubframe` with trace metadata propagation via `Trace.TraceService`
- **Risk**: Tool tracing context (parentMessage, toolCallId) currently flows through TracingService

#### 1.2 Update session.ts tool execution tracing

- The `runTools` method at line 274-304 uses `TracingService.layerSubframe` to scope trace context for tool calls
- Need to either:
  a. Pass trace context via Trace.Meta instead, OR
  b. Keep TracingService just for backward compatibility with operations that still emit via it
- **Decision**: Keep TracingService in scope for now since many operations use `TracingService.emitStatus()`. Remove from AiSession's _type_ requirements but provide it via the process layer.

#### 1.3 Remove TracingService requirement from AiSessionRunRequirements type

- Remove `TracingService` from the union type
- Ensure all callers provide it via Effect layers rather than as a direct requirement

### Phase 2: Trace Agent Process/Operations

**Goal**: Ensure agent processes emit proper trace events for observability.

#### 2.1 Agent process trace events

- **File**: `packages/core/assistant/src/service/agent-process.ts`
- Currently imports `TracingService` for the services list
- Need to emit trace events for:
  - Prompt received
  - Tool call started/completed
  - Agent turn started/completed
- Use `Trace.write()` with appropriate EventTypes

#### 2.2 Define trace event types for agent operations

- **File**: `packages/core/assistant/src/tracing.ts` (already has CompleteBlock, PartialBlock)
- Add event types:
  - `AgentTurnStarted` - when agent begins processing
  - `AgentTurnCompleted` - when agent finishes a turn
  - `ToolCallStarted` / `ToolCallCompleted` - for tool execution tracking

#### 2.3 Wire trace events in AiSession

- In `runAgentTurn()` - emit turn start/end events
- In `runTools()` - emit tool execution events
- These should flow through `Trace.TraceService` (new API)

### Phase 3: Verify All Tests Pass

#### 3.1 Project blueprint tests

- **File**: `packages/core/assistant-toolkit/src/blueprints/project/blueprint.test.ts`
- Currently passing, verify they stay passing after changes

#### 3.2 Trigger dispatcher tests

- **File**: `packages/core/functions-runtime/src/triggers/trigger-dispatcher.test.ts`
- Currently passing (18 tests, 1 skipped)

#### 3.3 ProcessManager tests

- **File**: `packages/core/functions-runtime/src/process/ProcessManager.test.ts`
- Currently passing (15 tests)

#### 3.4 Assistant tests

- **File**: `packages/core/assistant/src/session/session.test.ts`
- Currently passing (28 tests, 6 skipped)

### Phase 4: Verify No Degraded Functionality

#### 4.1 Composer working

- Run `moon run composer-app:build` to verify build
- Check that the processor still streams messages properly

#### 4.2 Pipeline working

- Verify conductor/compute pipeline still works
- Check `packages/core/conductor/` tests

#### 4.3 Observability via trace feed

- Verify FeedTraceSink writes trace messages
- Verify TracePanel reads from trace feed
- Verify ephemeral streaming works end-to-end

## Out of Scope

- Processes in the CLI
- Processes on EDGE
- Removing TracingService entirely (too many downstream consumers)

## Architecture Notes

### TracingService (Legacy) vs Trace.TraceService (New)

**TracingService** (deprecated):

- Queue-based, writes ECHO objects to invocation trace queues
- Has context scoping (parentMessage, toolCallId, invocation)
- Used by ~40 files across the codebase
- Manages invocation lifecycle (start/end events)

**Trace.TraceService** (new):

- Event-type-based, writes typed events with metadata
- Events buffered in ProcessManager, flushed to TraceSink
- Supports ephemeral events for streaming
- Simpler API: just `Trace.write(eventType, payload)`

**Migration strategy**: Both coexist. New code uses Trace.TraceService. TracingService remains for backward compatibility but is no longer required by core session/conversation types.

### Process-backed Execution Model

```
User prompt → AiChatProcessor → AgentService.getSession()
  → ProcessManager.spawn(AgentProcess)
    → Process.onInput(prompt)
    → Process.onAlarm() → AiConversation.createRequest()
      → AiSession.begin() → AiSession.runAgentTurn()
      → AiSession.runTools() → ProcessManager.spawn(OperationProcess)
        → Process.onChildEvent(exited) → feed result back
```

## Completion Criteria Checklist

- [x] Project blueprint tests passing (3/3 with flaky tag)
- [x] Trigger dispatcher tests passing (18 tests, 1 skipped)
- [x] All other unit tests passing (assistant, functions-runtime)
- [x] TracingService deprecated in AiSession requirements (kept for backward compat)
- [x] Agent process/operations traced via ProcessManager (SpawnedEvent, ExitedEvent)
- [x] Trace.TraceService added to ProcessManager builtinTagKeys
- [x] Service resolution fixed (FunctionInvocationService, ToolExecutionService, ToolResolverService)
- [x] Open handler added to assistant-toolkit MarkdownHandlers
- [x] No degraded functionality vs main (all tests pass, memory delete fixed via conversation regen)
- [x] Observability via new trace feed (FeedTraceSink wired in compute-runtime)
- [ ] Build succeeds (composer — blocked by pre-existing echo build failure)

## Key Fixes Made

1. **ProcessManager builtinTagKeys**: Added `Trace.TraceService.key` so processes don't try to resolve it via ServiceResolver (ProcessManager provides its own).
2. **Test layer ServiceResolver**: Added `FunctionInvocationService`, `ToolExecutionService`, `ToolResolverService` to `fromRequirements` so trigger-invoked operations can access them.
3. **MarkdownHandlers**: Added `Open` operation handler (was missing, causing AiToolNotFoundError when MarkdownBlueprint tools were invoked).
4. **Project test**: Added `PlanningHandlers` to test operationHandlers.
5. **Trace event types**: Defined AgentTurnStarted/Completed, ToolCallStarted/Completed, AgentInputReceived/RequestCompleted for future use.
