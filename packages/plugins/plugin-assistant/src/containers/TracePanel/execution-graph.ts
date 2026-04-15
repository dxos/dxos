//
// Copyright 2025 DXOS.org
//

import { AGENT_PROCESS_KEY, CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/functions';
import { Process } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { LogLevel } from '@dxos/log';
import { type Commit } from '@dxos/react-ui-components';

/**
 * Branch name for top-level operation invocations.
 */
const OPERATIONS_BRANCH = 'operations';

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
  eventLimit = 100,
}: BuildExecutionGraphParams): { branches: string[]; commits: Commit[] } => {
  const builder = new GraphBuilder();

  const events = traceMessages.slice(-eventLimit).flatMap((message) =>
    message.events.map((event: Trace.Event) => ({
      id: message.id,
      meta: message.meta,
      ...event,
    })),
  );

  for (const event of events) {
    if (Trace.isOfType(CompleteBlock, event)) {
      switch (event.data.block._tag) {
        case 'text': {
          if (event.data.role === 'user') {
            builder.addUserMessage(
              event.id,
              event.meta.conversationId ?? 'unknown_conversation',
              event.meta.pid ?? crypto.randomUUID(),
              event.data.block.text,
              event.timestamp,
            );
          } else {
            builder.addAssistantMessage(
              event.id,
              event.meta.conversationId ?? 'unknown_conversation',
              event.meta.pid ?? crypto.randomUUID(),
              event.data.block.text,
              event.timestamp,
            );
          }
          break;
        }
        case 'status': {
          builder.addStatusMessage(
            event.id,
            event.meta.conversationId ?? 'unknown_conversation',
            event.meta.pid ?? crypto.randomUUID(),
            event.data.block.statusText,
            event.timestamp,
          );
          break;
        }
        case 'toolCall': {
          builder.addToolCall(
            `${event.data.block.toolCallId}:call`,
            event.meta.conversationId ?? 'unknown_conversation',
            event.meta.pid ?? crypto.randomUUID(),
            event.data.block.name,
            event.timestamp,
          );
          break;
        }
        case 'toolResult': {
          builder.addToolResult(
            `${event.data.block.toolCallId}:result`,
            event.meta.conversationId ?? 'unknown_conversation',
            event.meta.pid ?? crypto.randomUUID(),
            event.data.block.error,
            event.timestamp,
          );
          break;
        }
      }
    }

    if (Trace.isOfType(Trace.OperationStart, event)) {
      if (!event.meta.conversationId) {
        builder.addOperationStart(
          `${event.id}:${event.data.key}:start`,
          event.meta.pid ?? crypto.randomUUID(),
          event.data.name ?? event.data.key,
          event.timestamp,
        );
      }
    }
    if (Trace.isOfType(Trace.OperationEnd, event)) {
      if (!event.meta.conversationId) {
        builder.addOperationEnd(
          `${event.id}:${event.data.key}:end`,
          event.meta.pid ?? crypto.randomUUID(),
          event.data.name ?? event.data.key,
          event.data.outcome,
          event.data.error,
          event.timestamp,
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
      const conversationId = DXN.parse(process.params.target).asEchoDXN()?.echoId;
      if (conversationId) {
        builder.addRunningAgent(process.pid, conversationId, Date.now());
      }
    }
  }

  return builder.build();
};

class GraphBuilder {
  #commits: Commit[] = [];
  #branches = new Set<string>();
  #lastCommitByBranch = new Map<string, string>();
  #operationPidToStartCommitId = new Map<string, string>();

  #addCommit(commit: Commit, opts?: { replaceCommit?: string }) {
    this.#branches.add(commit.branch);
    if (opts?.replaceCommit) {
      const commitIdx = this.#commits.findIndex((commit) => commit.id === opts.replaceCommit);
      if (commitIdx !== -1) {
        this.#commits[commitIdx] = commit;
      }
    } else {
      this.#commits.push(commit);
      this.#lastCommitByBranch.set(commit.branch, commit.id);
    }
  }

  #defaultParents(branch: string, opts?: { branchForFirst?: string }) {
    return this.#lastCommitByBranch.get(branch)
      ? [this.#lastCommitByBranch.get(branch)!]
      : opts?.branchForFirst
        ? [opts.branchForFirst]
        : [];
  }

  build() {
    return {
      commits: this.#commits,
      branches: [...this.#branches],
    };
  }

  addUserMessage(id: string, conversationId: string, pid: string, text: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, { branchForFirst: this.#operationPidToStartCommitId.get(pid) }),
      icon: 'ph--paper-plane-right--regular',
      level: LogLevel.VERBOSE,
      message: text.slice(0, 100),
      timestamp: new Date(ts),
    });
  }

  addAssistantMessage(id: string, conversationId: string, pid: string, text: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, { branchForFirst: this.#operationPidToStartCommitId.get(pid) }),
      icon: 'ph--drone--regular',
      level: LogLevel.VERBOSE,
      message: text.slice(0, 100),
      timestamp: new Date(ts),
    });
  }

  addStatusMessage(id: string, conversationId: string, pid: string, status: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, { branchForFirst: this.#operationPidToStartCommitId.get(pid) }),
      icon: 'ph--dot-outline--regular',
      level: LogLevel.INFO,
      message: status,
      timestamp: new Date(ts),
    });
  }

  addToolCall(id: string, conversationId: string, pid: string, toolName: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, { branchForFirst: this.#operationPidToStartCommitId.get(pid) }),
      icon: 'ph--wrench--regular',
      level: LogLevel.INFO,
      message: toolName,
      timestamp: new Date(ts),
    });
  }

  addToolResult(id: string, conversationId: string, pid: string, error: string | undefined, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, { branchForFirst: this.#operationPidToStartCommitId.get(pid) }),
      icon: error ? 'ph--x-circle--regular' : 'ph--check-circle--regular',
      level: error ? LogLevel.ERROR : LogLevel.INFO,
      message: error ? `Error: ${error}` : 'Success',
      timestamp: new Date(ts),
    });
  }

  addRunningAgent(pid: string, conversationId: string, ts: number) {
    this.#addCommit({
      id: pid,
      branch: conversationId,
      parents: this.#defaultParents(conversationId),
      icon: 'ph--spinner-gap--regular',
      level: LogLevel.INFO,
      message: 'Generating...',
      timestamp: new Date(ts),
    });
  }

  addOperationStart(id: string, pid: string, operationName: string, ts: number) {
    this.#operationPidToStartCommitId.set(pid, id);
    this.#addCommit({
      id,
      branch: OPERATIONS_BRANCH,
      parents: this.#defaultParents(OPERATIONS_BRANCH),
      icon: 'ph--play--regular',
      level: LogLevel.INFO,
      message: operationName,
      timestamp: new Date(ts),
    });
  }

  addOperationEnd(
    id: string,
    pid: string,
    operationName: string,
    outcome: 'success' | 'failure',
    error: string | undefined,
    ts: number,
  ) {
    const isError = outcome === 'failure';
    const startCommitId = this.#operationPidToStartCommitId.get(pid);
    const hasChildren = this.#commits.some((commit) => commit.parents?.includes(startCommitId!));
    this.#addCommit(
      {
        id,
        branch: OPERATIONS_BRANCH,
        parents: this.#defaultParents(OPERATIONS_BRANCH),
        icon: isError ? 'ph--x-circle--regular' : 'ph--check-circle--regular',
        level: isError ? LogLevel.ERROR : LogLevel.INFO,
        message: isError ? `${operationName}: ${error ?? 'Failed'}` : operationName,
        timestamp: new Date(ts),
      },
      {
        replaceCommit: hasChildren ? undefined : this.#operationPidToStartCommitId.get(pid),
      },
    );
  }
}
