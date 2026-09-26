//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { Actor, ContentBlock, Task } from '@dxos/types';

import * as Trigger from './types/Trigger.ts';

/**
 * Writes ephemeral or persistent events to the trace.
 * Exposed to processes and operations to record events to the trace.
 */
export interface Writer {
  write<T>(eventType: EventType<T>, payload: NoInfer<T>): void;
}

/**
 * Service that writes events to the trace.
 * Exposed to processes and operations to record events to the trace.
 */
export class TraceService extends Context.Service<TraceService, Writer>()('@dxos/functions/TraceService') {}

/**
 * Writes an event to the trace.
 */
export function write<T>(eventType: EventType<T>, payload: NoInfer<T>): Effect.Effect<void, never, TraceService> {
  return Effect.gen(function* () {
    log('trace write', { key: eventType.key, isEphemeral: eventType.isEphemeral });
    const writer = yield* TraceService;
    writer.write(eventType, payload);
  });
}

/**
 * Defines an event type for the trace.
 */
export interface EventType<T> {
  readonly key: string;
  readonly schema: Schema.Codec<T, any>;
  readonly isEphemeral: boolean;
}

export const EventType = <T>(
  key: string,
  opts: { schema: Schema.Codec<T, any>; isEphemeral: boolean },
): EventType<T> => {
  return {
    key,
    schema: opts.schema,
    isEphemeral: opts.isEphemeral,
  };
};

/**
 * Extracts the payload type from an event type.
 */
export type PayloadType<E extends EventType<unknown>> = E extends EventType<infer T> ? T : never;

export const Event = Schema.Struct({
  timestamp: Schema.Number,
  type: Schema.String,
  data: Schema.Unknown, // Type-specific payload;
});
export type Event = Schema.Schema.Type<typeof Event>;

/**
 * Checks if an event is of a given type.
 */
export const isOfType = <T, E extends Event>(eventType: EventType<T>, event: E): event is E & { data: T } => {
  return event.type === eventType.key;
};

/**
 * Extensible name informing which runtime executed the code that produced the event.
 */
export const RuntimeName = Schema.String.pipe(Schema.brand('@dxos/compute/Trace/RuntimeName'));
export type RuntimeName = Schema.Schema.Type<typeof RuntimeName>;

/**
 * Common runtime names.
 */
export const CommonRuntimeName = {
  /**
   * Web app / CLI / Desktop app / Mobile app.
   */
  local: RuntimeName.make('local'),
  edgeIntrinsic: RuntimeName.make('edge-intrinsic'),
  edgeWorkerLoader: RuntimeName.make('edge-worker-loader'),
  edgeWorkerForPlatforms: RuntimeName.make('edge-worker-for-platforms'),
};

/**
 * Metadata on the context of a trace message.
 */
// TODO(dmaretskyi): Expand on this: conversation id, tool call id, etc.
export const Meta = Schema.Struct({
  pid: Schema.optional(Schema.String), // NOTE: Not Process.ID to avoid circular dependency.
  parentPid: Schema.optional(Schema.String),
  processName: Schema.optional(Schema.String),

  /**
   * Space the message was produced in.
   * Stored as a string to avoid circular dependency on `@dxos/keys`.
   */
  space: Schema.optional(Schema.String),

  /**
   * Ref to the conversation feed object if present.
   */
  conversation: Ref.Ref(Obj.Unknown).pipe(Schema.optional),

  /**
   * Ref to the trigger object if invocation resulted from a trigger.
   */
  trigger: Ref.Ref(Trigger.Trigger).pipe(Schema.optional),

  /**
   * ID of the tool call that created the current process.
   */
  toolCallId: Schema.optional(Schema.String),

  /**
   * Extensible name informing which runtime executed the code that produced the event.
   */
  runtimeName: Schema.optional(RuntimeName),
});
export type Meta = Schema.Schema.Type<typeof Meta>;

/**
 * Checks if a runtime is an edge runtime.
 */
export const isEdgeRuntime = (name: RuntimeName): boolean =>
  name === CommonRuntimeName.edgeIntrinsic ||
  name === CommonRuntimeName.edgeWorkerLoader ||
  name === CommonRuntimeName.edgeWorkerForPlatforms;

/**
 * Envelope for a set of events.
 */
export const MessageData = Schema.Struct({
  meta: Meta,
  isEphemeral: Schema.Boolean,
  events: Schema.Array(Event),
});
export type MessageData = Schema.Schema.Type<typeof MessageData>;

export class Message extends Type.makeObject<Message>(DXN.make('org.dxos.type.traceMessage', '0.1.0'))(
  MessageData.pipe(Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'rose' })),
) {}

/**
 * Flattened representation of a signle event in a trace message.
 * Events are stored in batched messages for efficiency, but flat representation is more convenient for consumption.
 */
export interface FlatEvent extends Event {
  readonly meta: Meta;
  readonly isEphemeral: boolean;
}

/**
 * Flattens a trace message into a list of flat events.
 */
export const flatten = (message: Message): FlatEvent[] => {
  return message.events.map((event) => ({
    ...event,
    meta: message.meta,
    isEphemeral: message.isEphemeral,
  }));
};

//
// Swarm broadcast (DX-1125).
//
// Ephemeral trace messages produced on a remote runtime are broadcast over the space swarm and
// projected into the client's progress UI. The publisher tags each message with a flat key:value list
// derived from its meta; subscribers register a coarse tag (OR match at the swarm) and re-apply the
// exact filter (AND) client-side.
//

/**
 * `google.protobuf.Any` type URL for a trace message broadcast over the swarm.
 */
export const TRACE_MESSAGE_TYPE_URL = 'dxos.compute.TraceMessage';

/**
 * Declarative, serializable filter over trace messages. All present fields are ANDed. `type` matches
 * against event types within the message; the rest match against {@link Meta} fields. Refs
 * (`conversation`, `trigger`) are matched by their DXN string.
 */
export interface Filter {
  readonly type?: string;
  readonly pid?: string;
  readonly parentPid?: string;
  readonly conversation?: string;
  readonly trigger?: string;
  readonly space?: string;
  readonly runtimeName?: string;
  readonly toolCallId?: string;
}

/**
 * Derive the flat broadcast tag list for a message (DX-1125). The publisher emits all applicable tags;
 * subscribers match a subset (logical OR).
 */
export const messageToTags = (message: Pick<MessageData, 'meta' | 'events'>): string[] => {
  const { meta } = message;
  const tags: string[] = [];
  for (const event of message.events) {
    tags.push(`type:${event.type}`);
  }
  if (meta.pid) {
    tags.push(`pid:${meta.pid}`);
  }
  if (meta.parentPid) {
    tags.push(`parentPid:${meta.parentPid}`);
  }
  if (meta.conversation) {
    tags.push(`conversation:${meta.conversation.uri.toString()}`);
  }
  if (meta.trigger) {
    tags.push(`trigger:${meta.trigger.uri.toString()}`);
  }
  if (meta.space) {
    tags.push(`space:${meta.space}`);
  }
  if (meta.runtimeName) {
    tags.push(`runtime:${meta.runtimeName}`);
  }
  if (meta.toolCallId) {
    tags.push(`toolCall:${meta.toolCallId}`);
  }
  return tags;
};

/**
 * Pick the coarse subscription tag for a filter (DX-1125). The swarm cuts traffic to a superset of the
 * filter using its most selective present dimension; the client re-applies the exact filter.
 */
export const subscriptionTagForFilter = (filter: Filter): string | undefined => {
  if (filter.conversation !== undefined) {
    return `conversation:${filter.conversation}`;
  }
  if (filter.trigger !== undefined) {
    return `trigger:${filter.trigger}`;
  }
  if (filter.parentPid !== undefined) {
    return `parentPid:${filter.parentPid}`;
  }
  if (filter.pid !== undefined) {
    return `pid:${filter.pid}`;
  }
  if (filter.space !== undefined) {
    return `space:${filter.space}`;
  }
  if (filter.type !== undefined) {
    return `type:${filter.type}`;
  }
  return undefined;
};

/**
 * Exact (AND) filter match applied client-side after the coarse swarm subscription.
 */
export const matchesFilter = (message: Pick<MessageData, 'meta' | 'events'>, filter: Filter): boolean => {
  const { meta } = message;
  if (filter.type !== undefined && !message.events.some((event) => event.type === filter.type)) {
    return false;
  }
  if (filter.pid !== undefined && meta.pid !== filter.pid) {
    return false;
  }
  if (filter.parentPid !== undefined && meta.parentPid !== filter.parentPid) {
    return false;
  }
  if (filter.conversation !== undefined && meta.conversation?.uri.toString() !== filter.conversation) {
    return false;
  }
  if (filter.trigger !== undefined && meta.trigger?.uri.toString() !== filter.trigger) {
    return false;
  }
  if (filter.space !== undefined && meta.space !== filter.space) {
    return false;
  }
  if (filter.runtimeName !== undefined && meta.runtimeName !== filter.runtimeName) {
    return false;
  }
  if (filter.toolCallId !== undefined && meta.toolCallId !== filter.toolCallId) {
    return false;
  }
  return true;
};

/**
 * Wire-safe subset of {@link Meta} for broadcast. Ref fields (`conversation`, `trigger`) are not
 * carried in the payload — they are represented only as envelope tags — so the decoded message never
 * attempts ref resolution on the consumer.
 */
const encodeMetaForWire = (meta: Meta): Meta => ({
  pid: meta.pid,
  parentPid: meta.parentPid,
  processName: meta.processName,
  space: meta.space,
  toolCallId: meta.toolCallId,
  runtimeName: meta.runtimeName,
});

/**
 * Encode a trace message for the broadcast envelope's `google.protobuf.Any.value` (DX-1125).
 * The wire format is UTF-8 JSON of the message data (ref fields dropped — see {@link encodeMetaForWire}).
 */
export const encodeTraceMessage = (message: Pick<MessageData, 'meta' | 'isEphemeral' | 'events'>): Uint8Array =>
  new TextEncoder().encode(
    JSON.stringify({
      meta: encodeMetaForWire(message.meta),
      isEphemeral: message.isEphemeral,
      events: message.events,
    }),
  );

/**
 * Decode a broadcast trace message back into a {@link Message} object (DX-1125). The wire payload
 * drops both ref meta fields (see {@link encodeMetaForWire}), so `tags` — the broadcast envelope's
 * tag list — is required to restore them: `trigger` addresses work for cancellation, and
 * `conversation` is what {@link matchesFilter} compares, so a subscription filtered by it matches
 * nothing without this. Restored refs are address-only (`.uri`); they are never resolved.
 */
export const decodeTraceMessage = (bytes: Uint8Array, tags?: readonly string[]): Message => {
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<MessageData>;
  const meta = parsed.meta ?? {};
  const conversation = meta.conversation ?? refFromTags<Obj.Unknown>(tags, 'conversation:');
  const trigger = meta.trigger ?? refFromTags<Trigger.Trigger>(tags, 'trigger:');
  return Obj.make(Message, {
    meta: {
      ...meta,
      ...(conversation ? { conversation } : {}),
      ...(trigger ? { trigger } : {}),
    },
    isEphemeral: parsed.isEphemeral ?? true,
    events: parsed.events ?? [],
  });
};

/** The ref carried on a broadcast envelope's `<prefix><uri>` tag, when present and parseable. */
const refFromTags = <T>(tags: readonly string[] | undefined, prefix: string): Ref.Ref<T> | undefined => {
  const uri = tags?.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
  const eid = uri !== undefined ? EID.tryParse(uri) : undefined;
  return eid !== undefined ? Ref.fromURI(eid) : undefined;
};

/**
 * Sink for complete trace messages.
 */
export interface Sink {
  write(message: Message): void;
}

/**
 * Sink for complete trace messages.
 * The Process Manager forwards trace messages to it.
 */
// TODO(dmaretskyi): Consider moving sink to the Process Manager.
export class TraceSink extends Context.Service<TraceSink, Sink>()('@dxos/functions/TraceSink') {}

export const noopWriter: Writer = {
  write: () => {},
};

export const writerLayerNoop: Layer.Layer<TraceService> = Layer.succeed(TraceService, noopWriter);

export const noopSink: Sink = {
  write: () => {},
};

export const layerNoop: Layer.Layer<TraceSink> = Layer.succeed(TraceSink, noopSink);

export const layerConsole: Layer.Layer<TraceSink> = Layer.succeed(TraceSink, {
  write: (message) => {
    console.log(message);
  },
});

/**
 * Merge a set of sinks into a single sink.
 *
 * Each message is forwarded to every sink in order. Failures in one sink do not
 * prevent downstream sinks from receiving the message.
 */
export const mergeSinks = (sinks: readonly Sink[]): Sink => {
  if (sinks.length === 0) {
    return noopSink;
  }
  // Intentionally no singleton fast path: the guarded wrapper is the
  // contract of `mergeSinks`, so a throwing sink is always caught and
  // logged regardless of how many sinks were passed in.
  return {
    write: (message) => {
      for (const sink of sinks) {
        try {
          sink.write(message);
        } catch (err) {
          // Intentional: do not let one sink break the chain.
          // eslint-disable-next-line no-console
          console.error('[trace] sink.write threw', err);
        }
      }
    },
  };
};

/**
 * Builds a {@link TraceService} layer that wraps each `write` into a fresh {@link Message}
 * and forwards it to the provided {@link TraceSink}. Intended for tests and lightweight
 * fixtures.
 *
 * Options:
 *   - `meta`: stamped on every emitted message (defaults to `{}`).
 *   - `clock`: timestamp source (defaults to {@link Date.now}). Pass a monotonic counter
 *     in tests to make event ordering deterministic when many writes happen in the same
 *     millisecond.
 */
export const testTraceService = (
  opts: { meta?: Meta; clock?: () => number } = {},
): Layer.Layer<TraceService, never, TraceSink> =>
  Layer.effect(
    TraceService,
    Effect.gen(function* () {
      const sink = yield* TraceSink;
      const clock = opts.clock ?? Date.now;
      return {
        write: (event, data) => {
          sink.write(
            Obj.make(Message, {
              meta: opts.meta ?? {},
              isEphemeral: event.isEphemeral,
              events: [{ type: event.key, timestamp: clock(), data }],
            }),
          );
        },
      };
    }),
  );

//
// Operation Trace Events
//

/**
 * Outcome of an operation invocation.
 */
export type OperationOutcome = 'success' | 'failure';

/**
 * Operation invocation started.
 */
export const OperationStart = EventType('operation.start', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Phosphor icon identifier in `ph--<name>--<variant>` format. */
    icon: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});

/**
 * Operation invocation ended.
 */
export const OperationEnd = EventType('operation.end', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Phosphor icon identifier in `ph--<name>--<variant>` format. */
    icon: Schema.optional(Schema.String),
    /** Outcome of the operation. */
    outcome: Schema.Literals(['success', 'failure']),
    /** Error message if the operation failed. */
    error: Schema.optional(Schema.String),
    /**
     * Stable code (error name) of the failure, when the operation failed with a typed error.
     * Lets consumers match on the error kind (e.g. a run-again yield) without parsing the message.
     */
    errorCode: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});

/**
 * Operation input. Emitted as an ephemeral event alongside {@link OperationStart}
 * so subscribers (such as the undo/redo history tracker) can observe the raw
 * input payload without persisting it to long-lived sinks.
 */
export const OperationInput = EventType('operation.input', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Raw operation input. Shape determined by the operation definition. */
    input: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Operation output. Emitted as an ephemeral event just before
 * {@link OperationEnd} for successful invocations so subscribers (such as the
 * undo/redo history tracker) can observe the raw output payload without
 * persisting it to long-lived sinks.
 */
export const OperationOutput = EventType('operation.output', {
  schema: Schema.Struct({
    /** Operation key. */
    key: Schema.String,
    /** Human-readable operation name. */
    name: Schema.optional(Schema.String),
    /** Raw operation output. Shape determined by the operation definition. */
    output: Schema.Unknown,
  }),
  isEphemeral: true,
});

/**
 * Emitted when a task's status changes — a new task counts as a change from nothing.
 *
 * Nothing else in a trace says which task an agent was working on, so these events are what cut a
 * session's timeline into per-task segments. Every tool that moves a task's status emits one.
 */
export const TaskStatusChanged = EventType('task.statusChanged', {
  schema: Schema.Struct({
    taskId: Obj.ID,
    title: Schema.String,
    status: Task.Status,
    /** Absent when the task was just created, or held no status before. */
    previousStatus: Schema.optional(Task.Status),
  }),
  isEphemeral: false,
});

/**
 * An agent put a question to a person and stopped on it. Paired with {@link QuestionAnswered}, the
 * two bound the stretch a task spent blocked on someone else — the one gap in a session's timeline
 * that is not the agent's own latency.
 */
export const QuestionAsked = EventType('question.asked', {
  schema: Schema.Struct({
    /** Id of the question's entry in the task's history. */
    questionId: Obj.ID,
    /** The question as put to the reader. */
    text: Schema.String,
    /** The task the question blocks. */
    taskId: Schema.optional(Obj.ID),
    /** How many pre-baked answers were offered; free-form is always available besides these. */
    options: Schema.optional(Schema.Number),
  }),
  isEphemeral: false,
});

/** A person answered a {@link QuestionAsked}. */
export const QuestionAnswered = EventType('question.answered', {
  schema: Schema.Struct({
    questionId: Obj.ID,
    text: Schema.String,
    taskId: Schema.optional(Obj.ID),
    /** What the reader answered — a chosen option's title, or free-form text. */
    answer: Schema.String,
  }),
  isEphemeral: false,
});

/**
 * Human-readable status update emitted by an agent or operation.
 */
export const StatusUpdate = EventType('status.update', {
  schema: Schema.Struct({
    /** Human-readable status message.. */
    message: Schema.optional(Schema.String),

    progress: Schema.optional(
      Schema.Struct({
        /** Progress key. See {@link ProgressRegistry.key}. */
        key: Schema.String,

        /* Progress current item index. */
        current: Schema.optional(Schema.Number),

        /** Progress total item count. */
        total: Schema.optional(Schema.Number),

        /** Progress estimate of remaining time (ms). */
        estimate: Schema.optional(Schema.Number),

        /**
         * How many phases the run expects, and which is in flight. Independent of `current`/`total`,
         * which describe the phase in flight: a run can be on phase 2 of 4 and know nothing about how
         * long phase 2 is.
         */
        phases: Schema.optional(Schema.Number),
        phase: Schema.optional(Schema.Number),
      }),
    ),
  }),
  isEphemeral: true,
});

/**
 * Emit the current human-readable execution status to the trace.
 */
export const emitStatus: (
  messageOrData: string | PayloadType<typeof StatusUpdate>,
) => Effect.Effect<void, never, TraceService> = (message) =>
  write(StatusUpdate, typeof message === 'string' ? { message } : message);

//
// Agent events. Keyed `assistant.*` because that is what every recorded trace carries; they live
// here rather than in the assistant so a reader of the trace does not depend on the AI stack.
//

/**
 * Partial content block emitted.
 */
export const PartialBlock = EventType('assistant.partialBlock', {
  schema: Schema.Struct({
    messageId: Obj.ID,
    role: Actor.Role,
    block: ContentBlock.Any,
  }),
  isEphemeral: true,
});

/**
 * Complete content block emitted.
 */
export const CompleteBlock = EventType('assistant.completeBlock', {
  schema: Schema.Struct({
    messageId: Obj.ID,
    role: Actor.Role,
    block: ContentBlock.Any,
  }),
  isEphemeral: false,
});

export const AgentRequestBegin = EventType('assistant.agentRequestBegin', {
  schema: Schema.Struct({}),
  isEphemeral: false,
});

export const AgentRequestEnd = EventType('assistant.agentRequestEnd', {
  schema: Schema.Struct({
    status: Schema.Literals(['success', 'error', 'interrupted']),
    error: Schema.optional(Schema.String),
  }),
  isEphemeral: false,
});

/**
 * Emitted by the supervisor when a delegated task is handed to a sub-agent process; the only durable
 * record of the task ↔ pid pairing, since nothing is stamped on the task itself.
 */
export const DelegationSpawned = EventType('assistant.delegationSpawned', {
  schema: Schema.Struct({
    taskId: Schema.String,
    pid: Schema.String,
  }),
  isEphemeral: false,
});

/**
 * Emitted when an MCP server connection fails for a request turn.
 * Ephemeral so that misconfigured/unreachable servers don't pollute the durable feed,
 * but can still be surfaced to the user via the live ephemeral event stream.
 */
export const McpServerError = EventType('assistant.mcpServerError', {
  schema: Schema.Struct({
    url: Schema.String,
    protocol: Schema.Literals(['sse', 'http']),
    message: Schema.String,
    /** The server wants credentials the configuration does not (validly) supply. */
    unauthorized: Schema.optional(Schema.Boolean),
  }),
  isEphemeral: true,
});

/**
 * Stage a request has reached, in the order a turn passes through them.
 *
 * The reader waits through the setup stages before the first token arrives, and that wait is
 * dominated by whichever one is slow for their setup (a cold MCP server, a summarization pass over a
 * long feed), so each is named rather than folded into a single "working" state. The stages past
 * setup (`generating`, `calling-tool`) keep the line alive for the rest of the turn: an agentic turn
 * spends most of its time in tool calls, where a cleared line reads as a finished request.
 */
export const RequestPhaseName = Schema.Literals([
  /** Client-side: the agent process is being spawned or attached. Never emitted by the agent itself. */
  'starting',
  /** The turn fiber has begun; nothing has been loaded yet. */
  'preparing',
  'loading-history',
  'summarizing',
  'connecting-mcp',
  'building-toolkit',
  'encoding-prompt',
  'contacting-provider',
  /**
   * The model is streaming its reply. Derived client-side from the arriving blocks rather than
   * emitted by the agent: a write from inside the streaming pipeline adds a yield between parsing a
   * block and submitting it, which is observable in what the tools of that turn then see.
   */
  'generating',
  /** A tool the model called is executing; `detail` carries the tool's name. */
  'calling-tool',
  /**
   * The turn is over and the process is resident only to fire a pending alarm. Reported so the line
   * stops naming the stage the last turn ended in, which reads as a request that is still working.
   */
  'sleeping',
]);
export type RequestPhaseName = Schema.Schema.Type<typeof RequestPhaseName>;

/**
 * Setup stage a request has reached, emitted as the agent enters it.
 *
 * Ephemeral: this is progress for a wait that is over by the time anyone could read it back, and the
 * feed already records the turn's outcome. The UI shows the latest phase until the turn settles.
 */
export const RequestPhase = EventType('assistant.requestPhase', {
  schema: Schema.Struct({
    phase: RequestPhaseName,

    /**
     * 1-based attempt at the phase. Only `contacting-provider` re-attempts (a request the provider
     * rejected for permissions that have not propagated yet), and only there does a value above 1
     * mean anything to the reader.
     */
    attempt: Schema.optional(Schema.Number),

    /** Phase-specific label, e.g. the number of MCP servers being contacted. */
    detail: Schema.optional(Schema.String),
  }),
  isEphemeral: true,
});

/**
 * Emit the setup stage the request has reached.
 */
export const emitRequestPhase = (
  phase: RequestPhaseName,
  opts: { attempt?: number; detail?: string } = {},
): Effect.Effect<void, never, TraceService> => write(RequestPhase, { phase, ...opts });
