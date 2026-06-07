//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Either from 'effect/Either';
import { pipe } from 'effect/Function';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Process, Trace } from '@dxos/compute';
import { AGENT_PROCESS_KEY } from '@dxos/functions-runtime';
import { LogLevel, log } from '@dxos/log';
import { type Commit } from '@dxos/react-ui-components';
import { type ContentBlock } from '@dxos/types';

import { ROOT_SPAN_ID, type Span, buildSpanTree, isSpanBeginEvent, isSpanEndEvent, walkSpanTree } from './span-tree';

/**
 * Branch name for top-level operation invocations.
 */
const MAIN_BRANCH = 'main';

const ICONS = {
  agentRequestBegin: {
    icon: 'ph--atom--regular',
    level: LogLevel.VERBOSE,
  },
  agentRequestEnd: {
    icon: 'ph--atom--regular',
    level: LogLevel.INFO,
  },
  userMessage: {
    icon: 'ph--user--regular',
    level: LogLevel.VERBOSE,
  },
  statusMessage: {
    icon: 'ph--info--regular',
    level: LogLevel.VERBOSE,
  },
  operationStart: {
    icon: 'ph--function--regular',
    level: LogLevel.VERBOSE,
  },
  operationEndSuccess: {
    icon: 'ph--function--regular',
    level: LogLevel.INFO,
  },
  operationEndError: {
    icon: 'ph--function--regular',
    level: LogLevel.ERROR,
  },
  toolCall: {
    icon: 'ph--wrench--regular',
    level: LogLevel.VERBOSE,
  },
  toolResultSuccess: {
    icon: 'ph--wrench--regular',
    level: LogLevel.INFO,
  },
  toolResultError: {
    icon: 'ph--wrench--regular',
    level: LogLevel.ERROR,
  },
  agentRequestRunning: {
    icon: 'ph--spinner-gap--regular',
    level: LogLevel.VERBOSE,
  },
  processRunning: {
    icon: 'ph--spinner-gap--regular',
    level: LogLevel.VERBOSE,
  },
} as const;

export interface BuildExecutionGraphParams {
  traceMessages: Trace.Message[];
  activeProcesses?: readonly Process.Info[];
  eventLimit?: number;
}

/**
 * Builds a Timeline-compatible execution graph from trace messages and active processes.
 *
 * The conversion runs in two stages:
 *   1. `buildSpanTree` converts the flat list of trace messages into a hierarchical
 *      tree of spans grouped by process id (pid). See `./span-tree.ts`.
 *   2. `spanTreeToCommits` walks the tree and emits one commit per event, using the
 *      tree structure to decide which branch each commit belongs to and how to wire parents.
 *
 * Pure function — no signals or atoms.
 */
export type ExecutionGraph = {
  branches: string[];
  commits: Commit[];
  spanTree: Span;
  /** Commit id -> trace event. */
  details: ExecutionGraphDetailsMap;
};

export type ExecutionGraphDetailsMap = Record<string, Trace.FlatEvent | undefined>;

export const buildExecutionGraph = ({
  traceMessages,
  activeProcesses = [],
  eventLimit = 500,
}: BuildExecutionGraphParams): ExecutionGraph => {
  const spanTree = buildSpanTree(traceMessages, { eventLimit });
  const toolCallContext = buildToolCallContext(traceMessages);
  const built = spanTreeToCommits(spanTree, activeProcesses, toolCallContext);
  log('trace execution graph', {
    traceMessages: traceMessages.length,
    commits: built.commits.length,
    branches: built.branches.length,
    activeProcesses: activeProcesses.length,
  });
  return { ...built, spanTree };
};

/**
 * Lookup tables that pair `toolCall` blocks with their matching `toolResult` blocks so the
 * renderer can collapse the two events into a single commit (mirroring how begin/end events of
 * an empty operation span collapse). Indexed by the shared `toolCallId`.
 */
interface ToolCallContext {
  callById: Map<string, ContentBlock.ToolCall>;
  resultByCallId: Map<string, ContentBlock.ToolResult>;
}

const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallContext => {
  const callById = new Map<string, ContentBlock.ToolCall>();
  const resultByCallId = new Map<string, ContentBlock.ToolResult>();
  for (const message of messages) {
    for (const event of message.events) {
      if (event.type !== CompleteBlock.key) {
        continue;
      }
      const data = event.data as { block?: ContentBlock.Any } | undefined;
      const block = data?.block;
      if (!block) {
        continue;
      }
      if (block._tag === 'toolCall') {
        callById.set(block.toolCallId, block);
      } else if (block._tag === 'toolResult') {
        resultByCallId.set(block.toolCallId, block);
      }
    }
  }
  return { callById, resultByCallId };
};

/**
 * Visual representation of a single trace event — icon, log level, message string.
 * `undefined` indicates that the event should not produce a commit.
 */
interface EventPresentation {
  icon: string;
  level: LogLevel;
  message: string;
  idSuffix?: string;
}

const presentEvent = (event: Trace.FlatEvent, toolCallContext: ToolCallContext): EventPresentation | undefined => {
  if (Trace.isOfType(AgentRequestBegin, event)) {
    if (Either.isLeft(Schema.validateEither(AgentRequestBegin.schema)(event.data))) {
      log('invalid trace event', { type: event.type });
      return undefined;
    }
    return {
      icon: ICONS.agentRequestBegin.icon,
      level: ICONS.agentRequestBegin.level,
      message: 'Agent processing request...',
    };
  }
  if (Trace.isOfType(AgentRequestEnd, event)) {
    if (Either.isLeft(Schema.validateEither(AgentRequestEnd.schema)(event.data))) {
      log('invalid trace event', { type: event.type });
      return undefined;
    }
    return {
      icon: ICONS.agentRequestEnd.icon,
      level: ICONS.agentRequestEnd.level,
      message: 'Agent completed request',
    };
  }
  if (Trace.isOfType(CompleteBlock, event)) {
    if (Either.isLeft(Schema.validateEither(CompleteBlock.schema)(event.data))) {
      log('invalid trace event', { type: event.type });
      return undefined;
    }
    switch (event.data.block._tag) {
      case 'text':
        return event.data.role === 'user'
          ? {
              icon: ICONS.userMessage.icon,
              level: ICONS.userMessage.level,
              message: trimText(event.data.block.text),
            }
          : undefined;
      case 'status':
        return {
          icon: ICONS.statusMessage.icon,
          level: ICONS.statusMessage.level,
          message: trimText(event.data.block.statusText),
        };
      case 'toolCall': {
        // Operation-backed tool calls already have a dedicated routine span (Trace.OperationStart /
        // Trace.OperationEnd) that produces its own commits — skip the duplicate toolCall commit
        // to avoid double-rendering.
        if (event.data.block.operationKey) {
          return undefined;
        }
        // Collapse the toolCall/toolResult pair: when the matching toolResult has arrived, the
        // result event is the visible commit and carries the success/error state. The toolCall
        // itself only renders while still pending (i.e. no result yet) — same intent as an
        // operation span that collapses to a single end commit once both boundaries are present.
        if (toolCallContext.resultByCallId.has(event.data.block.toolCallId)) {
          return undefined;
        }
        return {
          icon: ICONS.toolCall.icon,
          level: ICONS.toolCall.level,
          message: event.data.block.name,
          idSuffix: `toolCall:${event.data.block.toolCallId}`,
        };
      }
      case 'toolResult': {
        // Suppress results for operation-backed calls — those are covered by the routine span.
        const call = toolCallContext.callById.get(event.data.block.toolCallId);
        if (call?.operationKey) {
          return undefined;
        }
        const success = event.data.block.error === undefined;
        const name = call?.name ?? event.data.block.name;
        return {
          icon: success ? ICONS.toolResultSuccess.icon : ICONS.toolResultError.icon,
          level: success ? ICONS.toolResultSuccess.level : ICONS.toolResultError.level,
          message: `${name} - ${success ? 'Success' : 'Error'}`,
          idSuffix: `toolResult:${event.data.block.toolCallId}`,
        };
      }
      default:
        return undefined;
    }
  }
  if (Trace.isOfType(Trace.OperationStart, event)) {
    if (Either.isLeft(Schema.validateEither(Trace.OperationStart.schema)(event.data))) {
      log('invalid trace event', { type: event.type });
      return undefined;
    }
    return {
      icon: event.data.icon ?? ICONS.operationStart.icon,
      level: ICONS.operationStart.level,
      message: event.data.name ?? event.data.key,
      idSuffix: `${event.data.key}:start`,
    };
  }
  if (Trace.isOfType(Trace.OperationEnd, event)) {
    if (Either.isLeft(Schema.validateEither(Trace.OperationEnd.schema)(event.data))) {
      log('invalid trace event', { type: event.type });
      return undefined;
    }
    const success = event.data.outcome === 'success';
    return {
      icon: event.data.icon ?? (success ? ICONS.operationEndSuccess.icon : ICONS.operationEndError.icon),
      level: success ? ICONS.operationEndSuccess.level : ICONS.operationEndError.level,
      message: `${event.data.name ?? event.data.key} - ${success ? 'Success' : 'Error'}`,
      idSuffix: `${event.data.key}:end`,
    };
  }
  return undefined;
};

/**
 * A span is "collapsible" when it would otherwise render as an empty fork-and-merge:
 * exactly two events that form a begin/end pair and no child sub-spans. In that case
 * we emit a single commit for the end event on the parent branch.
 *
 * A *pending* span (one whose end event has not yet been recorded) is never collapsed:
 * its trailing events should keep rendering as middle commits on the span's own branch
 * — never as a fake "end" commit on the parent branch.
 *
 * Both nested spans and top-level spans (whose parent is the synthetic root) are eligible
 * once they have completed: a span with no inner activity is collapsed regardless of where
 * it sits in the tree.
 */
const isCollapsibleSpan = (span: Span, parent: Span | null): boolean => {
  if (span.id === ROOT_SPAN_ID) {
    return false;
  }
  if (span.events.length !== 2) {
    return false;
  }
  if (span.children.length > 0) {
    return false;
  }
  const firstEvent = span.events[0];
  const lastEvent = span.events[span.events.length - 1];
  if (!isSpanBeginEvent(firstEvent) || !isSpanEndEvent(lastEvent)) {
    return false;
  }
  return parent !== null;
};

/**
 * Converts a span tree into a flat list of commits + branches suitable for `Timeline` rendering.
 *
 * For every span the algorithm:
 *  - emits the **first** event as a "begin" commit on the parent span's branch (fork);
 *  - emits **middle** events as commits on the span's own branch;
 *  - emits the **last** event as an "end" commit on the parent span's branch with two parents
 *    (the begin commit and the last commit on the span's own branch — a merge).
 *
 * Collapsible spans (`isCollapsibleSpan`) emit only the end commit on the parent branch with
 * a single parent — a tidier rendering for sub-operations that have no inner detail.
 *
 * Events are processed in global chronological order so that sub-operations of a span interleave
 * naturally with the span's own middle events.
 */
const spanTreeToCommits = (
  root: Span,
  activeProcesses: readonly Process.Info[],
  toolCallContext: ToolCallContext,
): { branches: string[]; commits: Commit[]; details: ExecutionGraphDetailsMap } => {
  const builder = new GraphBuilder();
  const details: ExecutionGraphDetailsMap = {};
  builder.addBranch(MAIN_BRANCH);

  // Build a child → parent lookup using the tree's own structure (already correctly parented
  // when the tree was constructed, including sequential spans of the same process).
  const parentBySpan = new Map<Span, Span | null>();
  parentBySpan.set(root, null);
  const indexParents = (span: Span): void => {
    for (const child of span.children) {
      parentBySpan.set(child, span);
      indexParents(child);
    }
  };
  indexParents(root);

  const findParentSpan = (span: Span): Span | null => parentBySpan.get(span) ?? null;

  // The branch name for a span is its pid — multiple sequential spans of the same process
  // (e.g. successive agent requests in one session) share a branch so they reuse a single lane.
  const branchOf = (span: Span | null): string => {
    if (!span || span.id === ROOT_SPAN_ID) {
      return MAIN_BRANCH;
    }
    return span.meta.pid ?? span.id;
  };

  // Selector that returns "the most recent commit in this span's structural context".
  //
  // The walk is structural (pid/parentPid), not topological: at each ancestor, we prefer
  //   1) the last commit on that span's own branch, then
  //   2) that span's begin commit (the fork point on its parent branch),
  //   3) and only then recurse into the parent span.
  //
  // Crucially, we never silently slip onto a *sibling* span's commit on a shared ancestor
  // branch. E.g. if a sub-span of agent A fires before A has any middle commits, we anchor
  // to A.begin — not to whatever unrelated commit happens to be the latest on main.
  // This keeps fork edges visually attached to the correct span even when sibling top-level
  // spans (different pids) overlap in time on main.
  const lastInSpanContext = (span: Span | null): CommitSelector => {
    if (!span || span.id === ROOT_SPAN_ID) {
      return CommitSelector.branch(MAIN_BRANCH).pipe(CommitSelector.compose(CommitSelector.last()));
    }
    const ownBranch = branchOf(span);
    const beginId = beginCommitIdBySpan.get(span.id);
    return CommitSelector.firstOf(
      CommitSelector.branch(ownBranch).pipe(CommitSelector.compose(CommitSelector.last())),
      beginId ? CommitSelector.id(beginId) : CommitSelector.filter(() => false),
      lastInSpanContext(findParentSpan(span)),
    );
  };

  // Flatten the tree into a chronological stream, recording each event's position within its span
  // so we can detect begin/end events.
  interface EventCursor {
    span: Span;
    event: Trace.FlatEvent;
    eventIndex: number;
    globalIndex: number;
  }
  const stream: EventCursor[] = [];
  walkSpanTree(root, (span) => {
    span.events.forEach((event, eventIndex) => {
      stream.push({ span, event, eventIndex, globalIndex: stream.length });
    });
  });
  stream.sort((a, b) => a.event.timestamp - b.event.timestamp || a.globalIndex - b.globalIndex);

  // Track the id of the begin commit for each non-collapsible span so the end commit can merge into it.
  const beginCommitIdBySpan = new Map<string, string>();

  for (const { span, event, globalIndex } of stream) {
    const presentation = presentEvent(event, toolCallContext);
    if (!presentation) {
      continue;
    }

    // Classify based on event TYPE, not array index. A pending span's trailing
    // middle event (e.g. a user message awaiting an agent response) must not be
    // mistaken for the span's end event — otherwise it would render on the
    // parent branch instead of the span's own branch.
    const isBeginEvent = isSpanBeginEvent(event);
    const isEndEvent = isSpanEndEvent(event);
    const parentSpan = findParentSpan(span);
    const collapsible = isCollapsibleSpan(span, parentSpan);

    // Collapsed spans: skip the begin event entirely; only the end event renders.
    if (collapsible && isBeginEvent) {
      continue;
    }

    const parentBranch = branchOf(parentSpan);
    const ownBranch = branchOf(span);

    let branch: string;
    let parents: string[];

    if (span.id === ROOT_SPAN_ID) {
      // Root-level events (no pid) attach sequentially to main.
      branch = MAIN_BRANCH;
      parents = builder.computeParents(lastInSpanContext(null));
    } else if (collapsible) {
      // Only the end event reaches here for collapsible spans.
      // Anchor to the parent span's structural context so the fork attaches to the parent
      // — not to a sibling span's commit that happens to be the latest on the shared ancestor.
      branch = parentBranch;
      parents = builder.computeParents(lastInSpanContext(parentSpan));
    } else if (isBeginEvent) {
      // Begin commit, anchored to the parent's structural context. A nested sub-span (same process,
      // or a span with no pid of its own) stays on the parent lane and only its middle events fork
      // — unchanged. A child PROCESS (its own pid, differing from the parent's) forks onto its OWN
      // branch from this first event, so a concurrent sub-agent gets its own lane immediately
      // instead of sharing the parent's lane until its first middle commit (which previously made
      // the lane "snap" across as events streamed in).
      const ownPid = span.meta.pid;
      const parentPid = parentSpan?.meta.pid;
      const isProcessBoundary = ownPid != null && parentPid != null && ownPid !== parentPid;
      branch = isProcessBoundary ? ownBranch : parentBranch;
      parents = builder.computeParents(lastInSpanContext(parentSpan));
    } else if (isEndEvent) {
      // End commit: continues the parent branch chronologically and merges in own-branch work.
      //
      // Parent #1 is the *immediate predecessor* on the parent branch (not the matching begin
      // commit). Pointing back to the begin commit creates a visual edge that skips over any
      // sibling span's commits emitted between begin and end — e.g. when two top-level Routine
      // spans overlap on main, R1.end would otherwise draw an arrow back to R1.begin that
      // crosses over R2.begin. Anchoring to the previous main commit keeps main linear.
      branch = parentBranch;
      parents = builder.computeParents(
        CommitSelector.unionAll(
          CommitSelector.branch(parentBranch).pipe(CommitSelector.compose(CommitSelector.last())),
          CommitSelector.branch(ownBranch).pipe(CommitSelector.compose(CommitSelector.last())),
        ),
      );
    } else {
      // Middle event: continue the span's own branch; fall back to span's own context so the
      // first middle event of a span forks from the span's begin commit, not from a sibling's
      // commit on an ancestor branch.
      branch = ownBranch;
      parents = builder.computeParents(lastInSpanContext(span));
    }

    const commitId = formatCommitId(span, globalIndex, presentation.idSuffix);
    const commit: Commit = {
      id: commitId,
      branch,
      parents,
      timestamp: new Date(event.timestamp),
      icon: presentation.icon,
      level: presentation.level,
      message: presentation.message,
    };
    builder.addCommit(commit);
    details[commitId] = event;

    // Record begin commit so a later end event can merge into it.
    if (isBeginEvent && !collapsible && span.id !== ROOT_SPAN_ID) {
      beginCommitIdBySpan.set(span.id, commitId);
    }
  }

  // Append "running" indicators for processes that are still active.
  for (const process of activeProcesses) {
    if (
      process.key === AGENT_PROCESS_KEY &&
      process.params.target &&
      (process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING)
    ) {
      builder.addCommit({
        id: `running:${process.pid}`,
        branch: process.pid,
        parents: builder.computeParents(
          CommitSelector.branch(process.pid).pipe(CommitSelector.compose(CommitSelector.last())),
        ),
        icon: ICONS.agentRequestRunning.icon,
        level: ICONS.agentRequestRunning.level,
        message: 'Generating...',
        timestamp: new Date(),
      });
    } else if (process.state === Process.State.RUNNING && builder.hasBranch(process.pid)) {
      builder.addCommit({
        id: `running:${process.pid}`,
        branch: process.pid,
        parents: builder.computeParents(
          CommitSelector.branch(process.pid).pipe(CommitSelector.compose(CommitSelector.last())),
        ),
        icon: ICONS.processRunning.icon,
        level: ICONS.processRunning.level,
        message: 'Running...',
        timestamp: new Date(),
      });
    }
  }

  const { commits, branches } = builder.build();
  return { commits, branches, details };
};

const formatCommitId = (span: Span, globalIndex: number, suffix?: string): string => {
  const base = `${span.id}:${globalIndex}`;
  return suffix ? `${base}:${suffix}` : base;
};

const trimText = (text: string) => text.slice(0, 100).trim().split('\n')[0];

type Falsy = false | null | undefined;

export interface CommitSelector extends Pipeable.Pipeable {
  select: (commits: Commit[]) => Commit[];
}

export const CommitSelector = {
  make: (select: CommitSelector['select']): CommitSelector => ({
    select,
    pipe(...args: any) {
      return Pipeable.pipeArguments(this, args);
    },
  }),

  identity: (): CommitSelector => CommitSelector.make((commits) => commits),

  /**
   * Selects commits that match the given predicate.
   */
  filter: (predicate: (commit: Commit) => unknown): CommitSelector =>
    CommitSelector.make((commits) => commits.filter(predicate)),

  /**
   * Selects commits by id.
   */
  id: (id: string): CommitSelector => CommitSelector.filter((commit) => commit.id === id),
  /**
   * Selects commits by tag.
   */
  tag: (tag: string | Falsy): CommitSelector => CommitSelector.filter((commit) => tag && commit.tags?.includes(tag)),
  /**
   * Selects commits by if any of the given tags are present.
   */
  anyTags: (tags: (string | Falsy)[]): CommitSelector =>
    CommitSelector.filter((commit) => tags.some((tag) => tag && commit.tags?.includes(tag))),
  /**
   * Selects commits by branch.
   */
  branch: (branch: string | Falsy): CommitSelector =>
    CommitSelector.filter((commit) => branch && commit.branch === branch),

  /**
   * Chains two selectors together, applying the second selector to the result of the first.
   *
   * Example:
   *
   * ```
   * CommitSelector.tag('tag').pipe(CommitSelector.compose(CommitSelector.branch('main')));
   * ```
   */
  compose:
    (next: CommitSelector) =>
    (prev: CommitSelector): CommitSelector =>
      CommitSelector.make((commits) => next.select(prev.select(commits))),

  /**
   * If `prev` selector matches no commits, return `next` selector, otherwise return `prev` selector.
   * Same as `CommitSelector.firstOf(prev, next)`.
   *
   * Example:
   *
   * ```
   * CommitSelector.tag('tag').pipe(CommitSelector.orElse(CommitSelector.branch('main')));
   * ```
   */
  orElse:
    (next: CommitSelector) =>
    (prev: CommitSelector): CommitSelector =>
      CommitSelector.make((commits) => {
        const selected = prev.select(commits);
        if (selected.length > 0) {
          return selected;
        }
        return next.select(commits);
      }),

  /**
   * Selects commits that match either of the given selectors.
   */
  andAlso:
    (next: CommitSelector) =>
    (prev: CommitSelector): CommitSelector =>
      CommitSelector.unionAll(prev, next),

  /**
   * Selects the first n commits.
   */
  first: (n: number = 1): CommitSelector => CommitSelector.make((commits) => commits.slice(0, n)),
  /**
   * Selects the last n commits (reverses the order of the commits).
   */
  last: (n: number = 1): CommitSelector => CommitSelector.make((commits) => commits.toReversed().slice(0, n)),
  /**
   * Selects commits that do not match the given selector.
   */
  not: (selector: CommitSelector): CommitSelector =>
    CommitSelector.make((commits) => {
      const selected = selector.select(commits);
      return commits.filter((commit) => !selected.includes(commit));
    }),

  /**
   * Selects commits that match any of the given selectors.
   */
  unionAll: (...selectors: CommitSelector[]): CommitSelector =>
    CommitSelector.make((commits) => {
      return Array.dedupeWith(
        selectors.flatMap((selector) => selector.select(commits)),
        (a, b) => a.id === b.id,
      );
    }),

  /**
   * Selects commits that match all of the given selectors.
   */
  intersectAll: (...selectors: CommitSelector[]): CommitSelector =>
    CommitSelector.make((commits) => {
      const selected = selectors.map((selector) => selector.select(commits));
      if (selected.length === 0) {
        return [];
      }
      return selected[0].filter((commit) => selected.every((selected) => selected.some((c) => c.id === commit.id)));
    }),

  /**
   * Returns the result of the first selector that matches any commits.
   */
  firstOf: (...selectors: CommitSelector[]): CommitSelector =>
    CommitSelector.make((commits) => {
      for (const selector of selectors) {
        const selected = selector.select(commits);
        if (selected.length > 0) {
          return selected;
        }
      }
      return [];
    }),
};

class GraphBuilder {
  #commits: Commit[] = [];
  #branches = new Set<string>();

  findCommits(selector: CommitSelector): Commit[] {
    return selector.select(this.#commits);
  }

  hasBranch(branch: string): boolean {
    return this.#branches.has(branch);
  }

  addCommit(commit: Commit) {
    this.addBranch(commit.branch);
    this.#commits.push(commit);
  }

  /**
   * Computes parents — picks first matching commit's id.
   */
  computeParents(selector: CommitSelector): string[] {
    return Array.dedupe(selector.select(this.#commits).map((commit) => commit.id));
  }

  addBranch(branch: string) {
    this.#branches.add(branch);
  }

  /**
   * Removes duplicate commits and dangling parents.
   */
  doctor() {
    this.#commits = pipe(
      this.#commits,
      Array.dedupeWith((a, b) => a.id === b.id),
      Array.map(
        Struct.evolve({
          parents: (parents) =>
            parents ? Array.filter(parents, (id) => this.#commits.some((commit) => commit.id === id)) : undefined,
        }),
      ),
    );
  }

  build() {
    this.doctor();
    return {
      commits: this.#commits,
      branches: [...this.#branches],
    };
  }
}
