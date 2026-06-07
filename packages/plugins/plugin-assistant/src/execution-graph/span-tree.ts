//
// Copyright 2026 DXOS.org
//

import { AgentRequestBegin, AgentRequestEnd } from '@dxos/assistant';
import { Trace } from '@dxos/compute';

/**
 * Synthetic id assigned to the root span.
 * The root is a virtual container for top-level spans (those without a parent in the captured trace).
 */
export const ROOT_SPAN_ID = '<main>';

/**
 * Computed metadata for a span.
 * Derived from the meta of the begin event that opened the span.
 */
export interface SpanMeta {
  readonly pid?: string;
  readonly parentPid?: string;
  readonly processName?: string;
  readonly conversationId?: string;
  readonly triggerId?: string;
  readonly toolCallId?: string;
  readonly runtimeName?: string;
}

/**
 * A span in the trace hierarchy.
 *
 * Each span represents a single bounded unit of work — an operation invocation or an
 * agent request. Spans are opened by `OperationStart` / `AgentRequestBegin` events and
 * closed by their matching `OperationEnd` / `AgentRequestEnd` events. A single process
 * (pid) may produce multiple sequential spans (for example, an agent session that serves
 * three prompts produces three sibling spans sharing the agent's pid).
 *
 * `events` contains the bounded events for this span only — child spans' events are not
 * duplicated here. `children` contains sub-spans that opened while this span was active.
 */
export interface Span {
  readonly id: string;
  readonly meta: SpanMeta;
  readonly events: Trace.FlatEvent[];
  readonly children: Span[];
}

export const BEGIN_EVENT_TYPES = new Set<string>([Trace.OperationStart.key, AgentRequestBegin.key]);
export const END_EVENT_TYPES = new Set<string>([Trace.OperationEnd.key, AgentRequestEnd.key]);

export const isSpanBeginEvent = (event: Trace.FlatEvent): boolean => BEGIN_EVENT_TYPES.has(event.type);
export const isSpanEndEvent = (event: Trace.FlatEvent): boolean => END_EVENT_TYPES.has(event.type);

const computeMeta = (rawMeta: Trace.Meta): SpanMeta => ({
  pid: rawMeta.pid,
  parentPid: rawMeta.parentPid,
  processName: rawMeta.processName,
  conversationId: rawMeta.conversationId,
  triggerId: rawMeta.triggerId,
  toolCallId: rawMeta.toolCallId,
  runtimeName: rawMeta.runtimeName,
});

interface MutableSpan {
  id: string;
  meta: SpanMeta;
  events: Trace.FlatEvent[];
  children: MutableSpan[];
  firstTimestamp: number;
}

const makeMutableSpan = (id: string, meta: SpanMeta): MutableSpan => ({
  id,
  meta,
  events: [],
  children: [],
  firstTimestamp: Number.POSITIVE_INFINITY,
});

const freezeSpan = (span: MutableSpan): Span => ({
  id: span.id,
  meta: span.meta,
  events: span.events,
  children: span.children.map(freezeSpan),
});

export interface BuildSpanTreeOptions {
  /**
   * If provided, caps how many *non-boundary* events (status updates, partial blocks, etc.)
   * are retained — only the most recent `eventLimit` of them survive. Span boundary events
   * (`OperationStart` / `OperationEnd` / `AgentRequestBegin` / `AgentRequestEnd`) are *always*
   * retained regardless of the limit, because dropping them would orphan their child spans
   * and collapse them onto the root branch.
   */
  eventLimit?: number;
}

/**
 * Builds a hierarchical span tree from a list of trace messages.
 *
 * Algorithm:
 *   1. Flatten messages into events and sort them chronologically.
 *   2. For each event:
 *      - Begin events (`OperationStart`, `AgentRequestBegin`) open a new span whose parent
 *        is the currently-open span of the event's `meta.parentPid`, or the root if there is
 *        none. The begin event itself becomes the first event of the new span.
 *      - End events (`OperationEnd`, `AgentRequestEnd`) close the currently-open span for
 *        the event's `meta.pid` and become its last event.
 *      - Other events attach to the currently-open span for their `meta.pid`, or to the
 *        root span if no span is currently open for that pid (or the event has no pid).
 *   3. Sort each span's children by their earliest event timestamp.
 */
export const buildSpanTree = (messages: Trace.Message[], options: BuildSpanTreeOptions = {}): Span => {
  const allEvents = messages.flatMap((message) => Trace.flatten(message));
  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  // The limit caps verbose middle events (status/partial-block) only. Span boundary events
  // are always retained so the parent/child structure of older spans isn't dropped — losing a
  // begin event detaches every descendant and collapses them onto the root branch.
  const events = applyEventLimit(allEvents, options.eventLimit);

  const root = makeMutableSpan(ROOT_SPAN_ID, {});

  // Currently-open span for each pid.
  // A process may host multiple sequential spans (e.g. successive agent requests), so we
  // track the active one and start a new span on the next begin event.
  const openSpans = new Map<string, MutableSpan>();

  // Most-recent span for each pid, open OR already closed. Used as the parent fallback for a
  // child process whose parent span has already ended — e.g. a delegated sub-agent runs
  // concurrently and its begin event arrives after the supervisor's turn (its parent) closed.
  // Without this the child would nest at the root and render on its own top-level lane, reusing
  // a sibling's released lane instead of forking off its parent.
  const lastSpanByPid = new Map<string, MutableSpan>();

  let spanCounter = 0;
  const allocSpanId = (pid: string): string => {
    const id = `${pid}#${spanCounter}`;
    spanCounter += 1;
    return id;
  };

  const noteTimestamp = (span: MutableSpan, timestamp: number): void => {
    if (timestamp < span.firstTimestamp) {
      span.firstTimestamp = timestamp;
    }
  };

  for (const event of events) {
    const pid = event.meta.pid;

    if (!pid) {
      // Events without a pid attach to the root.
      root.events.push(event);
      noteTimestamp(root, event.timestamp);
      continue;
    }

    if (BEGIN_EVENT_TYPES.has(event.type)) {
      const parentPid = event.meta.parentPid;
      // Prefer the parent's currently-open span; fall back to its most-recent (closed) span so a
      // child process whose parent has already ended still nests under it (delegated sub-agents).
      const parent = (parentPid && (openSpans.get(parentPid) ?? lastSpanByPid.get(parentPid))) || root;
      const span = makeMutableSpan(allocSpanId(pid), computeMeta(event.meta));
      span.events.push(event);
      noteTimestamp(span, event.timestamp);
      parent.children.push(span);
      // The new span supersedes any previously-open span for this pid.
      openSpans.set(pid, span);
      lastSpanByPid.set(pid, span);
      continue;
    }

    if (END_EVENT_TYPES.has(event.type)) {
      const span = openSpans.get(pid);
      if (span) {
        span.events.push(event);
        noteTimestamp(span, event.timestamp);
        openSpans.delete(pid);
      } else {
        // End event without a matching begin — attach to root so the event isn't lost.
        root.events.push(event);
        noteTimestamp(root, event.timestamp);
      }
      continue;
    }

    // Non-boundary event: attach to the currently-open span for this pid if any.
    const open = openSpans.get(pid);
    if (open) {
      open.events.push(event);
      noteTimestamp(open, event.timestamp);
    } else {
      root.events.push(event);
      noteTimestamp(root, event.timestamp);
    }
  }

  // Sort children chronologically for deterministic output.
  const sortChildren = (span: MutableSpan): void => {
    span.children.sort((a, b) => a.firstTimestamp - b.firstTimestamp);
    for (const child of span.children) {
      sortChildren(child);
    }
  };
  sortChildren(root);

  return freezeSpan(root);
};

/**
 * Caps the number of non-boundary events while retaining every span boundary event.
 *
 * Boundary events define the span tree's structure: dropping a begin event detaches every
 * descendant span (its `parentPid` lookup fails, so children fall back to the root), and
 * dropping an end event leaves a span open and corrupts the open-span map for sibling spans
 * that share a pid. Status/partial-block events are the noisy bulk and the only ones the
 * limit needs to control.
 *
 * The returned array stays in chronological order.
 */
const applyEventLimit = (events: readonly Trace.FlatEvent[], eventLimit: number | undefined): Trace.FlatEvent[] => {
  if (eventLimit === undefined) {
    return [...events];
  }

  let nonBoundaryCount = 0;
  for (const event of events) {
    if (!isBoundary(event)) {
      nonBoundaryCount += 1;
    }
  }
  if (nonBoundaryCount <= eventLimit) {
    return [...events];
  }

  const dropCount = nonBoundaryCount - eventLimit;
  let dropped = 0;
  const result: Trace.FlatEvent[] = [];
  for (const event of events) {
    if (!isBoundary(event) && dropped < dropCount) {
      dropped += 1;
      continue;
    }
    result.push(event);
  }
  return result;
};

const isBoundary = (event: Trace.FlatEvent): boolean =>
  BEGIN_EVENT_TYPES.has(event.type) || END_EVENT_TYPES.has(event.type);

/**
 * Walks the span tree in depth-first pre-order, invoking `visit` for each span (root included).
 */
export const walkSpanTree = (root: Span, visit: (span: Span, depth: number) => void, depth = 0): void => {
  visit(root, depth);
  for (const child of root.children) {
    walkSpanTree(child, visit, depth + 1);
  }
};

/**
 * Returns all spans in the tree in depth-first pre-order, root first.
 */
export const flattenSpanTree = (root: Span): Span[] => {
  const result: Span[] = [];
  walkSpanTree(root, (span) => result.push(span));
  return result;
};
