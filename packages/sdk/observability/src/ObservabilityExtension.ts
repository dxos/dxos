//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import { type CleanupFn } from '@dxos/async';
import { type MetricObserver } from '@dxos/tracing';

export * from './extensions';

/**
 * Kind of observability extension.
 *
 * - errors: Error tracking (e.g., PostHog)
 * - events: Product usage event tracking (e.g., PostHog)
 * - support: Support tickets anchoring user reports and telemetry (e.g., PostHog)
 * - ai: Model inferences, tool calls, and turns (e.g., PostHog LLM analytics, OTel gen_ai)
 * - logs: Structured logging (e.g., OTEL)
 * - mcp: MCP server sessions and tool calls (e.g., PostHog)
 * - metrics: Metric data (e.g., OTEL)
 * - traces: Distributed tracing (e.g., OTEL)
 */
export type Kind = 'ai' | 'errors' | 'events' | 'support' | 'logs' | 'mcp' | 'metrics' | 'traces';

/**
 * Base for every extension API variant. All kinds implement availability the same way.
 */
export type ExtensionApiBase<K extends Kind = Kind> = {
  kind: K;
  isAvailable(): Effect.Effect<boolean>;
};

/**
 * Instrument-level metadata, declared once by the first caller for a given metric name.
 * Units must be UCUM as OTel requires — `s`, `By`, `{thing}`.
 */
export type MetricMeta = { unit?: string; description?: string };

/**
 * Metrics extension API (kind-specific methods only).
 */
export type Metrics = {
  gauge(name: string, value: number, tags?: Attributes, meta?: MetricMeta): void;
  increment(name: string, value?: number, tags?: Attributes, meta?: MetricMeta): void;
  distribution(name: string, value: number, tags?: Attributes, meta?: MetricMeta): void;
  /**
   * Registers a callback read once per export interval.
   * Prefer this over {@link Metrics.gauge} for any "current value" metric, since a pushed gauge
   * only lands in the export windows its producer happens to tick in.
   */
  observe(name: string, callback: MetricObserver, tags?: Attributes, meta?: MetricMeta): CleanupFn;
};

/**
 * Errors extension API (kind-specific methods only).
 */
export type Errors = {
  captureException(error: Error, attributes?: Attributes): void;
};

/**
 * Wider than {@link Attributes}: event properties carry structured values (message arrays,
 * nested objects), not just scalars.
 */
export type EventAttributes = Record<string, unknown>;

/**
 * Events extension API (kind-specific methods only).
 */
export type Events = {
  captureEvent(event: string, attributes?: EventAttributes): void;
};

/**
 * One model call, already filtered by the capture policy and scrubbed (see `AiObservability`). Shaped
 * after the OTel GenAI conventions rather than any vendor's schema — an extension maps it onto
 * whatever its backend calls these things.
 */
export type Inference = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  /** Provider span name, e.g. `LanguageModel.streamText`. */
  spanName: string;
  /** `gen_ai.system` — the serving product, not the wire dialect. */
  provider?: string;
  model?: string;
  /** Conversation the call belongs to, when the call site named one. */
  sessionId?: string;
  /** Request parameters the provider reported (temperature, max_tokens, …). */
  parameters?: Record<string, unknown>;
  /** Excludes tokens served from the prompt cache; add {@link cacheReadTokens} for the total. */
  inputTokens?: number;
  outputTokens?: number;
  /** Absent rather than zero when the provider does not report prompt caching. */
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  /** Wall-clock duration, in seconds. */
  latency: number;
  streaming: boolean;
  /** Absent entirely when the capture policy denied it. */
  content?: GenerationContent;
  /** Exception class name only — a provider's message can embed request or response fragments. */
  errorClass?: string;
};

export type GenerationContent = {
  /** Parsed prompt messages, or the raw string when {@link truncated} left it unparseable. */
  input?: unknown;
  output?: unknown;
  tools?: unknown;
  /** Some field above was cut to fit, so it is a fragment rather than the whole. */
  truncated?: boolean;
};

/** Fields a turn and a tool call share with an inference: identity, timing, and gated content. */
export type AiSpanBase = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  /** For a tool call, the tool's name rather than the span's. */
  spanName: string;
  /** Conversation the span belongs to, when the call site named one. */
  sessionId?: string;
  /** Wall-clock duration, in seconds. */
  latency: number;
  /** Absent entirely when the capture policy denied it. */
  content?: AiSpanContent;
  /** Exception class name only, as on {@link Inference}. */
  errorClass?: string;
};

export type AiSpanContent = {
  input?: unknown;
  output?: unknown;
  /** Some field above was cut to fit, so it is a fragment rather than the whole. */
  truncated?: boolean;
};

/**
 * One conversation turn: the unit a backend groups a turn's model calls and tool calls under (what
 * PostHog calls a trace). Its input is the user prompt and its output the messages the turn produced.
 */
export type Turn = AiSpanBase;

/** One tool call inside a turn (what PostHog calls a span), with the arguments and the result. */
export type ToolCall = AiSpanBase;

/**
 * AI extension API (kind-specific methods only).
 */
export type Ai = {
  captureInference(inference: Inference): void;
  captureTurn(turn: Turn): void;
  captureToolCall(toolCall: ToolCall): void;
};

/** What every event in one MCP session carries; learned at `initialize` and stamped on the calls that follow. */
export type McpSession = {
  /** Groups the session's events; one server process is one session over a stdio transport. */
  sessionId: string;
  clientName?: string;
  clientVersion?: string;
  protocolVersion?: string;
};

/** MCP extension API (kind-specific methods only). */
export type Mcp = {
  captureInitialize(session: McpSession): void;
  captureToolCall(
    call: McpSession & { toolName: string; parameters?: unknown; durationMs: number; isError: boolean },
  ): void;
};

/**
 * Support extension API (kind-specific methods only). The ticket itself is filed by a backend;
 * the extension supplies what only the browser has: the log dump and the session context.
 */
export type Support = {
  /** Uploads the buffered debug logs to long-lived storage; resolves with the key, or undefined when nothing went. */
  uploadLogs(): Promise<string | undefined>;
  /** The telemetry session to anchor the ticket to, if this extension has one. */
  sessionContext(): SupportSessionContext | undefined;
  /**
   * Ships the buffered debug logs to the extension's log store, every record stamped with the
   * given attributes: the ticket id for a support report, the report id for a team issue.
   */
  flushLogs(attributes: Record<string, string>): Promise<void>;
};

export type ExtensionApi =
  | (ExtensionApiBase<'errors'> & Errors)
  | (ExtensionApiBase<'events'> & Events)
  | (ExtensionApiBase<'support'> & Support)
  | (ExtensionApiBase<'ai'> & Ai)
  // TODO(wittjosiah): Direct logs api?
  | (ExtensionApiBase<'mcp'> & Mcp)
  | ExtensionApiBase<'logs'>
  | (ExtensionApiBase<'metrics'> & Metrics)
  // TODO(wittjosiah): Direct traces api?
  | ExtensionApiBase<'traces'>;

/**
 * What a browser knows about its own telemetry session, for a backend that files the ticket on
 * its behalf. Shaped after what posthog-js's own widget sends.
 */
export type SupportSessionContext = {
  distinctId: string;
  /** Browser-minted id the widget API uses for access control on anonymous tickets. */
  widgetSessionId: string;
  sessionId?: string;
  replayUrl?: string;
  currentUrl?: string;
};

/**
 * Attributes to be attached to observability events.
 */
export type Attributes = Record<string, string | number | boolean | undefined>;

/**
 * Implementation of an observability extension API.
 */
/** What an extension may reach back into once it is initialized. */
export type ExtensionContext = {
  /** Tag every signal, or only the signals of one kind, on every extension that emits them. */
  setTags(tags: Attributes, kind?: Kind): void;
};

export type Extension = {
  initialize?(context: ExtensionContext): Effect.Effect<void, Error>;
  close?(): Effect.Effect<void>;
  enable?(): Effect.Effect<void>;
  disable?(): Effect.Effect<void>;
  flush?(): Effect.Effect<void>;
  identify?(distinctId: string, attributes?: Attributes, setOnceAttributes?: Attributes): void;
  alias?(distinctId: string, previousId?: string): void;
  /** `kind` narrows the tags to one signal kind; without it they apply to everything the extension emits. */
  setTags?(tags: Record<string, string>, kind?: Kind): void;
  enabled: boolean;
  apis: ExtensionApi[];
};
