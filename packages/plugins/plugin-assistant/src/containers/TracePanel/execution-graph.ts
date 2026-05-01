//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Order from 'effect/Order';
import * as Pipeable from 'effect/Pipeable';
import * as Predicate from 'effect/Predicate';
import * as Struct from 'effect/Struct';

import { AGENT_PROCESS_KEY, AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/compute';
import { Process } from '@dxos/functions-runtime';
import { LogLevel, log } from '@dxos/log';
import { type Commit } from '@dxos/react-ui-components';

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
  assistantMessage: {
    icon: 'ph--drone--regular',
    level: LogLevel.VERBOSE,
  },
  statusMessage: {
    icon: 'ph--info--regular',
    level: LogLevel.VERBOSE,
  },
  toolCall: {
    icon: 'ph--wrench--regular',
    level: LogLevel.VERBOSE,
  },
  toolResult: {
    icon: 'ph--wrench--regular',
    level: LogLevel.INFO,
  },
  toolResultError: {
    icon: 'ph--wrench--regular',
    level: LogLevel.ERROR,
  },
  toolResultSuccess: {
    icon: 'ph--wrench--regular',
    level: LogLevel.INFO,
  },
  runningAgent: {
    icon: 'ph--spinner-gap--regular',
    level: LogLevel.INFO,
  },
  operationStart: {
    icon: 'ph--function--regular',
    level: LogLevel.VERBOSE,
  },
  operationEnd: {
    icon: 'ph--function--regular',
    level: LogLevel.INFO,
  },
  operationEndError: {
    icon: 'ph--function--regular',
    level: LogLevel.ERROR,
  },
  operationEndSuccess: {
    icon: 'ph--function--regular',
    level: LogLevel.INFO,
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

const tagPid = (pid: string) => `pid:${pid}`;
const tagParentPid = (parentPid: string) => `parent-pid:${parentPid}`;
const tagConversation = (conversationId: string) => `conversation:${conversationId}`;
const tagOperationBegin = (pid: string) => `operation-begin:${pid}`;
const tagStartMarker = (pid: string) => `start-marker:${pid}`;

const getTags = (meta: Trace.Meta) => {
  const tags: string[] = [];
  if (meta.pid) {
    tags.push(tagPid(meta.pid));
  }
  if (meta.parentPid) {
    tags.push(tagParentPid(meta.parentPid));
  }
  if (meta.conversationId) {
    tags.push(tagConversation(meta.conversationId));
  }
  return tags;
};

export interface BuildExecutionGraphParams {
  traceMessages: Trace.Message[];
  activeProcesses?: readonly Process.Info[];
  eventLimit?: number;
}

/**
 * Builds a Timeline-compatible execution graph from trace messages and active processes.
 * Pure function — no signals or atoms.
 */
export const buildExecutionGraph = ({
  traceMessages,
  activeProcesses = [],
  eventLimit = 500,
}: BuildExecutionGraphParams): { branches: string[]; commits: Commit[] } => {
  const builder = new GraphBuilder();

  const events = traceMessages
    .flatMap((message) =>
      message.events.map((event: Trace.Event, index) => ({
        ...event,
        meta: message.meta,
        id: 'id' in event ? (event as any).id : `${message.id}:${index}`,
      })),
    )
    .slice(-eventLimit);

  builder.addBranch(MAIN_BRANCH);

  for (const event of events) {
    if (Trace.isOfType(AgentRequestBegin, event)) {
      builder.addCommit({
        id: event.id,
        branch: event.meta.parentPid ?? MAIN_BRANCH,
        parents: builder.computeParents(
          CommitSelector.branch(event.meta.parentPid ?? MAIN_BRANCH).pipe(
            CommitSelector.compose(CommitSelector.last()),
          ),
        ),
        tags: [...getTags(event.meta), event.meta.pid && tagStartMarker(event.meta.pid)].filter(
          Predicate.isNotNullable,
        ),
        timestamp: new Date(event.timestamp),
        icon: ICONS.agentRequestBegin.icon,
        level: ICONS.agentRequestBegin.level,
        message: 'Agent processing request...',
      });
    } else if (Trace.isOfType(AgentRequestEnd, event)) {
      builder.addCommit({
        id: event.id,
        branch: event.meta.parentPid ?? MAIN_BRANCH,
        parents: builder.computeParents(
          CommitSelector.unionAll(
            CommitSelector.branch(event.meta.parentPid ?? MAIN_BRANCH).pipe(
              CommitSelector.orElse(CommitSelector.tag(event.meta.pid && tagPid(event.meta.pid))),
              CommitSelector.compose(CommitSelector.last()),
            ),
            CommitSelector.tag(event.meta.pid && tagPid(event.meta.pid)).pipe(
              CommitSelector.compose(CommitSelector.last()),
            ),
          ),
        ),
        tags: getTags(event.meta),
        timestamp: new Date(event.timestamp),
        icon: ICONS.agentRequestEnd.icon,
        level: ICONS.agentRequestEnd.level,
        message: 'Agent completed request',
      });
    } else if (Trace.isOfType(CompleteBlock, event)) {
      switch (event.data.block._tag) {
        case 'text': {
          if (event.data.role === 'user') {
            builder.addCommit({
              id: event.id,
              branch: event.meta.pid ?? MAIN_BRANCH,
              parents: builder.computeParents(
                CommitSelector.branch(event.meta.pid ?? MAIN_BRANCH).pipe(
                  CommitSelector.compose(CommitSelector.last()),
                  CommitSelector.orElse(
                    CommitSelector.tag(event.meta.pid && tagStartMarker(event.meta.pid)).pipe(
                      CommitSelector.compose(CommitSelector.last()),
                    ),
                  ),
                ),
              ),
              tags: getTags(event.meta),
              timestamp: new Date(event.timestamp),
              icon: ICONS.userMessage.icon,
              level: ICONS.userMessage.level,
              message: trimText(event.data.block.text),
            });
          }
          break;
        }
        case 'status': {
          builder.addCommit({
            id: event.id,
            branch: event.meta.pid ?? MAIN_BRANCH,
            parents: builder.computeParents(
              CommitSelector.branch(event.meta.pid ?? MAIN_BRANCH).pipe(
                CommitSelector.compose(CommitSelector.last()),
                CommitSelector.orElse(
                  CommitSelector.tag(event.meta.pid && tagPid(event.meta.pid)).pipe(
                    CommitSelector.compose(CommitSelector.last()),
                  ),
                ),
              ),
            ),
            tags: getTags(event.meta),
            timestamp: new Date(event.timestamp),
            icon: ICONS.statusMessage.icon,
            level: ICONS.statusMessage.level,
            message: trimText(event.data.block.statusText),
          });
          break;
        }
      }
    } else if (Trace.isOfType(Trace.OperationStart, event)) {
      builder.addCommit({
        id: `${event.id}:${event.data.key}:start`,
        branch: event.meta.parentPid ?? MAIN_BRANCH,
        parents: builder.computeParents(
          CommitSelector.branch(event.meta.parentPid ?? MAIN_BRANCH).pipe(
            CommitSelector.andAlso(CommitSelector.tag(event.meta.parentPid && tagStartMarker(event.meta.parentPid))),
            CommitSelector.compose(CommitSelector.orderByTimestamp()),
            CommitSelector.compose(CommitSelector.last()),
            CommitSelector.orElse(CommitSelector.branch(event.meta.parentPid)),
            CommitSelector.compose(CommitSelector.last()),
          ),
        ),
        tags: [
          ...getTags(event.meta),
          tagOperationBegin(`${event.meta.pid ?? 'unknown'}:${event.data.key}`),
          event.meta.pid && tagStartMarker(event.meta.pid),
        ].filter(Predicate.isNotNullable),
        timestamp: new Date(event.timestamp),
        icon: ICONS.operationStart.icon,
        level: ICONS.operationStart.level,
        message: event.data.name ?? event.data.key,
      });
    } else if (Trace.isOfType(Trace.OperationEnd, event)) {
      const children = builder.findCommits(
        CommitSelector.anyTags([
          event.meta.pid && tagPid(event.meta.pid),
          event.meta.pid && tagParentPid(event.meta.pid),
        ]),
      );
      builder.addCommit(
        {
          id: `${event.id}:${event.data.key}:end`,
          branch: event.meta.parentPid ?? MAIN_BRANCH,
          parents: builder.computeParents(
            CommitSelector.branch(event.meta.parentPid ?? MAIN_BRANCH).pipe(
              CommitSelector.compose(
                CommitSelector.not(
                  CommitSelector.tag(tagOperationBegin(`${event.meta.pid ?? 'unknown'}:${event.data.key}`)),
                ),
              ),
              CommitSelector.orElse(CommitSelector.tag(event.meta.parentPid && tagStartMarker(event.meta.parentPid))),
              CommitSelector.compose(CommitSelector.last()),
              CommitSelector.andAlso(
                CommitSelector.anyTags([
                  event.meta.pid && tagPid(event.meta.pid),
                  event.meta.pid && tagParentPid(event.meta.pid),
                ]).pipe(
                  CommitSelector.compose(
                    CommitSelector.not(
                      CommitSelector.tag(tagOperationBegin(`${event.meta.pid ?? 'unknown'}:${event.data.key}`)),
                    ),
                  ),
                  CommitSelector.compose(CommitSelector.last()),
                ),
              ),
            ),
          ),
          tags: getTags(event.meta),
          timestamp: new Date(event.timestamp),
          icon: event.data.outcome === 'success' ? ICONS.operationEndSuccess.icon : ICONS.operationEndError.icon,
          level: event.data.outcome === 'success' ? ICONS.operationEndSuccess.level : ICONS.operationEndError.level,
          message: `${event.data.name ?? event.data.key} - ${event.data.outcome === 'success' ? 'Success' : 'Error'}`,
        },
        {
          replace:
            // TODO(dmaretskyi): Deduping events in subbranches brekas graph.
            !event.meta.parentPid || children.length > 1 // 1 is the operation begin commit.
              ? undefined
              : CommitSelector.tag(tagOperationBegin(`${event.meta.pid ?? 'unknown'}:${event.data.key}`)),
        },
      );
    }
  }

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

  const built = builder.build();
  log('trace execution graph', {
    traceMessages: traceMessages.length,
    flatEvents: events.length,
    commits: built.commits.length,
    branches: built.branches.length,
    activeProcesses: activeProcesses.length,
  });
  return built;
};

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

  orderByTimestamp: (): CommitSelector =>
    CommitSelector.make(Array.sortWith((a) => a.timestamp?.getTime() ?? 0, Order.number)),
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

  addCommit(
    commit: Commit,
    opts?: {
      ifMissing?: CommitSelector;
      /**
       * Replace in-place the last commit that matches the selector.
       */
      replace?: CommitSelector;
    },
  ) {
    if (opts?.ifMissing) {
      if (this.findCommits(opts.ifMissing).length > 0) {
        return;
      }
    }
    this.addBranch(commit.branch);
    if (opts?.replace) {
      const matches = this.findCommits(opts.replace);
      if (matches.length > 0) {
        const replaced = matches.at(-1)!;
        this.#commits.splice(this.#commits.indexOf(replaced), 1);
        // Update parents to point to the new commit.
        for (const existingCommit of this.#commits) {
          if (existingCommit.parents) {
            for (let i = 0; i < existingCommit.parents.length; i++) {
              if (existingCommit.parents[i] === replaced.id) {
                existingCommit.parents[i] = commit.id;
              }
            }
          }
        }
        this.#commits.push(commit);
        return;
      }
    }
    this.#commits.push(commit);
  }

  removeCommit(selector: CommitSelector) {
    for (const commit of this.findCommits(selector)) {
      this.#commits.splice(this.#commits.indexOf(commit), 1);
    }
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

const trimText = (text: string) => text.slice(0, 100).trim().split('\n')[0];
