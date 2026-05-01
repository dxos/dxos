//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';

import { AGENT_PROCESS_KEY, AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Process, Trace } from '@dxos/functions';
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
    icon: 'ph--check-circle--regular',
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
    icon: 'ph--dot-outline--regular',
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
    icon: 'ph--check-circle--regular',
    level: LogLevel.INFO,
  },
  runningAgent: {
    icon: 'ph--spinner-gap--regular',
    level: LogLevel.INFO,
  },
  operationStart: {
    icon: 'ph--play--regular',
    level: LogLevel.VERBOSE,
  },
  operationEnd: {
    icon: 'ph--check-circle--regular',
    level: LogLevel.INFO,
  },
  operationEndError: {
    icon: 'ph--x-circle--regular',
    level: LogLevel.ERROR,
  },
  operationEndSuccess: {
    icon: 'ph--check-circle--regular',
    level: LogLevel.INFO,
  },
  agentRequestRunning: {
    icon: 'ph--spinner-gap--regular',
    level: LogLevel.INFO,
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

  const events = traceMessages.slice(-eventLimit).flatMap((message) =>
    message.events.map((event: Trace.Event) => ({
      id: message.id,
      meta: message.meta,
      ...event,
    })),
  );

  builder.addBranch(MAIN_BRANCH);

  for (const event of events) {
    if (Trace.isOfType(AgentRequestBegin, event)) {
      builder.addCommit({
        id: event.id,
        branch: event.meta.parentPid ?? MAIN_BRANCH,
        parents: builder.computeParents([{ branch: event.meta.parentPid ?? MAIN_BRANCH }]),
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
        parents: builder.computeParents([
          { branch: event.meta.parentPid ?? MAIN_BRANCH },
          { commit: { tags: [event.meta.pid && tagPid(event.meta.pid)] } },
        ]),
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
              parents: builder.computeParents([
                {
                  branch: event.meta.pid ?? MAIN_BRANCH,
                  fallback: { tags: [event.meta.pid && tagPid(event.meta.pid)] },
                },
                {
                  commit: {
                    tags: [event.meta.parentPid && tagStartMarker(event.meta.parentPid)].filter(
                      Predicate.isNotNullable,
                    ),
                  },
                },
              ]),
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
            parents: builder.computeParents([
              {
                branch: event.meta.pid ?? MAIN_BRANCH,
                fallback: { tags: [event.meta.pid && tagPid(event.meta.pid)] },
              },
            ]),
            tags: getTags(event.meta),
            timestamp: new Date(event.timestamp),
            icon: ICONS.statusMessage.icon,
            level: ICONS.statusMessage.level,
            message: trimText(event.data.block.statusText),
          });
          break;
        }
        case 'toolCall': {
          builder.addCommit({
            id: `${event.data.block.toolCallId}:call`,
            branch: event.meta.pid ?? MAIN_BRANCH,
            parents: builder.computeParents([
              {
                branch: event.meta.pid ?? MAIN_BRANCH,
                fallback: { tags: [event.meta.pid && tagPid(event.meta.pid)] },
              },
            ]),
            tags: getTags(event.meta),
            timestamp: new Date(event.timestamp),
            icon: ICONS.toolCall.icon,
            level: ICONS.toolCall.level,
            message: event.data.block.name,
          });
          break;
        }
        case 'toolResult': {
          builder.addCommit(
            {
              id: `${event.data.block.toolCallId}:result`,
              branch: event.meta.pid ?? MAIN_BRANCH,
              parents: builder.computeParents([
                {
                  branch: event.meta.pid ?? MAIN_BRANCH,
                  fallback: { tags: [event.meta.pid && tagPid(event.meta.pid)] },
                },
              ]),
              tags: getTags(event.meta),
              timestamp: new Date(event.timestamp),
              icon: event.data.block.error ? ICONS.toolResultError.icon : ICONS.toolResultSuccess.icon,
              level: event.data.block.error ? ICONS.toolResultError.level : ICONS.toolResultSuccess.level,
              message: event.data.block.error
                ? `${event.data.block.name} - Error: ${trimText(event.data.block.error)}`
                : `${event.data.block.name} - Success`,
            },
            {
              replace: {
                id: [`${event.data.block.toolCallId}:call`],
              },
            },
          );
          break;
        }
      }
    } else if (Trace.isOfType(Trace.OperationStart, event)) {
      if (!event.meta.conversationId) {
        // Ignoring tool calls.
        builder.addCommit({
          id: `${event.id}:${event.data.key}:start`,
          branch: event.meta.parentPid ?? MAIN_BRANCH,
          parents: builder.computeParents([
            {
              branch: event.meta.parentPid ?? MAIN_BRANCH,
              fallback: { tags: [event.meta.parentPid && tagPid(event.meta.parentPid)] },
            },
            {
              commit: {
                tags: [event.meta.parentPid && tagStartMarker(event.meta.parentPid)].filter(Predicate.isNotNullable),
              },
            },
          ]),
          tags: [
            ...getTags(event.meta),
            tagOperationBegin(event.meta.pid ?? 'unknown'),
            event.meta.pid && tagStartMarker(event.meta.pid),
          ].filter(Predicate.isNotNullable),
          timestamp: new Date(event.timestamp),
          icon: ICONS.operationStart.icon,
          level: ICONS.operationStart.level,
          message: event.data.name ?? event.data.key,
        });
      }
    } else if (Trace.isOfType(Trace.OperationEnd, event)) {
      if (!event.meta.conversationId) {
        // Ignoring tool calls.
        const children = builder.findCommits({ tags: [event.meta.pid && tagPid(event.meta.pid)] });
        builder.addCommit(
          {
            id: `${event.id}:${event.data.key}:end`,
            branch: event.meta.parentPid ?? MAIN_BRANCH,
            parents: builder.computeParents([
              {
                branch: event.meta.parentPid ?? MAIN_BRANCH,
                fallback: { tags: [event.meta.parentPid && tagPid(event.meta.parentPid)] },
              },
              { commit: { tags: [event.meta.pid && tagPid(event.meta.pid)] } },
              {
                commit: {
                  tags: [event.meta.parentPid && tagStartMarker(event.meta.parentPid)].filter(Predicate.isNotNullable),
                },
              },
            ]),
            tags: getTags(event.meta),
            timestamp: new Date(event.timestamp),
            icon: event.data.outcome === 'success' ? ICONS.operationEndSuccess.icon : ICONS.operationEndError.icon,
            level: event.data.outcome === 'success' ? ICONS.operationEndSuccess.level : ICONS.operationEndError.level,
            message: event.data.name ?? event.data.key,
          },
          {
            replace:
              // TODO(dmaretskyi): Deduping events in subbranches brekas graph.
              !event.meta.parentPid && children.length > 1 // 1 is the operation begin commit.
                ? undefined
                : {
                    tags: [tagOperationBegin(event.meta.pid ?? 'unknown')],
                  },
          },
        );
      }
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
        parents: builder.computeParents([{ branch: process.pid }]),
        icon: ICONS.agentRequestRunning.icon,
        level: ICONS.agentRequestRunning.level,
        message: 'Generating...',
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
type MaybeFalsy<T> = T | Falsy;

// TODO(dmaretskyi): Replace this with simple composition of predicates.
type CommitSelector = { id?: MaybeFalsy<string>[]; tags?: MaybeFalsy<string>[] };

class GraphBuilder {
  #commits: Commit[] = [];
  #branches = new Set<string>();

  findCommits(selector: CommitSelector) {
    return this.#commits.filter((commit) => {
      if (selector.id && selector.id.includes(commit.id)) {
        return true;
      }
      if (selector.tags && selector.tags.some((tag) => tag && commit.tags?.includes(tag))) {
        return true;
      }
      return false;
    });
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
      const commits = this.findCommits(opts.ifMissing);
      if (commits.length > 0) {
        return;
      }
    }
    this.addBranch(commit.branch);
    if (opts?.replace) {
      const commits = this.findCommits(opts.replace);
      if (commits.length > 0) {
        this.#commits[this.#commits.indexOf(commits.at(-1)!)] = commit;
        return;
      }
    }
    this.#commits.push(commit);
  }

  removeCommit(selector: CommitSelector) {
    const commits = this.findCommits(selector);
    for (const commit of commits) {
      this.#commits.splice(this.#commits.indexOf(commit), 1);
    }
  }

  /**
   * Computes parents based on a list of specs.
   */
  computeParents(
    specs: (
      | {
          /**
           * Parent commits selector.
           */
          commit?: CommitSelector;
        }
      | {
          /**
           * Last commit on this branch as parent.
           */
          branch?: string;

          /**
           * Fallback if branch has no commits.
           */
          fallback?: CommitSelector;
        }
    )[],
  ): string[] {
    return specs.flatMap((spec) => {
      if ('commit' in spec && spec.commit) {
        return this.findCommits(spec.commit)
          .slice(-1)
          .map((commit) => commit.id);
      }
      if ('branch' in spec && spec.branch) {
        const lastCommit = this.#commits.findLast((commit) => commit.branch === spec.branch);
        if (lastCommit) {
          return [lastCommit.id];
        } else if (spec.fallback) {
          return this.findCommits(spec.fallback)
            .slice(-1)
            .map((commit) => commit.id);
        } else {
          return [];
        }
      }
      return [];
    });
  }

  addBranch(branch: string) {
    this.#branches.add(branch);
  }

  build() {
    return {
      commits: this.#commits,
      branches: [...this.#branches],
    };
  }
}

const trimText = (text: string) => text.slice(0, 100).trim().split('\n')[0];
