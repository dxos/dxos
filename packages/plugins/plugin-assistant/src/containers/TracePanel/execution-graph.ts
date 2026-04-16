//
// Copyright 2025 DXOS.org
//

import { AGENT_PROCESS_KEY, AgentRequestBegin, AgentRequestEnd, CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/functions';
import { Process } from '@dxos/functions-runtime';
import { DXN } from '@dxos/keys';
import { LogLevel } from '@dxos/log';
import { type Commit } from '@dxos/react-ui-components';

/**
 * Branch name for top-level operation invocations.
 */
const MAIN_BRANCH = 'main';

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
    if (Trace.isOfType(AgentRequestBegin, event)) {
      builder.addAgentRequestBegin(event.id, event.meta, event.timestamp);
    } else if (Trace.isOfType(AgentRequestEnd, event)) {
      builder.addAgentRequestEnd(event.id, event.meta, event.timestamp);
    } else if (Trace.isOfType(CompleteBlock, event)) {
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
            event.data.block.toolCallId,
            event.timestamp,
          );
          break;
        }
        case 'toolResult': {
          builder.addToolResult(
            `${event.data.block.toolCallId}:result`,
            event.meta.conversationId ?? 'unknown_conversation',
            event.data.block.name,
            event.data.block.error,
            event.data.block.toolCallId,
            event.timestamp,
          );
          break;
        }
      }
    } else if (Trace.isOfType(Trace.OperationStart, event)) {
      if (!event.meta.conversationId) {
        builder.addOperationStart(
          `${event.id}:${event.data.key}:start`,
          event.data.name ?? event.data.key,
          event.meta,
          event.timestamp,
        );
      }
    } else if (Trace.isOfType(Trace.OperationEnd, event)) {
      if (!event.meta.conversationId) {
        builder.addOperationEnd(
          `${event.id}:${event.data.key}:end`,
          event.data.name ?? event.data.key,
          event.data.outcome as 'success' | 'failure',
          event.data.error,
          event.meta,
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
  #toolCallIdToStartCommitId = new Map<string, string>();

  #addCommit(commit: Commit, opts?: { replaceCommit?: string }) {
    this.#branches.add(commit.branch);
    if (opts?.replaceCommit) {
      const commitIdx = this.#commits.findIndex((commit) => commit.id === opts.replaceCommit);
      if (commitIdx !== -1) {
        this.#commits[commitIdx] = commit;
        return;
      }
    }
    this.#commits.push(commit);
    this.#lastCommitByBranch.set(commit.branch, commit.id);
  }

  /**
   * @param parentForFirstOnBranch - The parent commit ID for the first commit on the branch.
   */
  #defaultParents(branch: string, opts?: { parentForFirstOnBranch?: string }) {
    return this.#lastCommitByBranch.get(branch)
      ? [this.#lastCommitByBranch.get(branch)!]
      : opts?.parentForFirstOnBranch
        ? [opts.parentForFirstOnBranch]
        : [];
  }

  build() {
    return {
      commits: this.#commits,
      branches: [...this.#branches],
    };
  }

  addAgentRequestBegin(id: string, meta: Trace.Meta, ts: number) {
    if (meta.pid) {
      this.#operationPidToStartCommitId.set(meta.pid, id);
    }
    this.#addCommit({
      id,
      branch: meta.parentPid ?? MAIN_BRANCH,
      parents: this.#defaultParents(MAIN_BRANCH),
      icon: 'ph--play--regular',
      level: LogLevel.INFO,
      message: 'Agent processing request...',
      timestamp: new Date(ts),
    });
  }

  addAgentRequestEnd(id: string, meta: Trace.Meta, ts: number) {
    if (meta.pid) {
      this.#operationPidToStartCommitId.delete(meta.pid);
    }
    this.#addCommit({
      id,
      branch: meta.parentPid ?? MAIN_BRANCH,
      parents: [
        ...this.#defaultParents(MAIN_BRANCH),
        ...this.#defaultParents(meta.conversationId ?? crypto.randomUUID()),
      ],
      icon: 'ph--check-circle--regular',
      level: LogLevel.INFO,
      message: 'Agent completed request',
      timestamp: new Date(ts),
    });
  }

  addUserMessage(id: string, conversationId: string, pid: string, text: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, {
        parentForFirstOnBranch: this.#operationPidToStartCommitId.get(pid) ?? 'main',
      }),
      icon: 'ph--paper-plane-right--regular',
      level: LogLevel.VERBOSE,
      message: trimText(text),
      timestamp: new Date(ts),
    });
  }

  addAssistantMessage(id: string, conversationId: string, pid: string, text: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, {
        parentForFirstOnBranch: this.#operationPidToStartCommitId.get(pid),
      }),
      icon: 'ph--drone--regular',
      level: LogLevel.VERBOSE,
      message: trimText(text),
      timestamp: new Date(ts),
    });
  }

  addStatusMessage(id: string, conversationId: string, pid: string, status: string, ts: number) {
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, {
        parentForFirstOnBranch: this.#operationPidToStartCommitId.get(pid),
      }),
      icon: 'ph--dot-outline--regular',
      level: LogLevel.INFO,
      message: trimText(status),
      timestamp: new Date(ts),
    });
  }

  addToolCall(id: string, conversationId: string, pid: string, toolName: string, toolCallId: string, ts: number) {
    this.#toolCallIdToStartCommitId.set(toolCallId, id);
    this.#addCommit({
      id,
      branch: conversationId,
      parents: this.#defaultParents(conversationId, {
        parentForFirstOnBranch: this.#operationPidToStartCommitId.get(pid),
      }),
      icon: 'ph--wrench--regular',
      level: LogLevel.INFO,
      message: toolName,
      timestamp: new Date(ts),
    });
  }

  addToolResult(
    id: string,
    conversationId: string,
    toolName: string,
    error: string | undefined,
    toolCallId: string,
    ts: number,
  ) {
    const startCommitId = toolCallId && this.#toolCallIdToStartCommitId.get(toolCallId);
    const hasChildren = this.#commits.some((commit) => commit.parents?.includes(startCommitId!));
    this.#addCommit(
      {
        id,
        branch: conversationId,
        parents: this.#defaultParents(conversationId, {
          parentForFirstOnBranch: startCommitId,
        }),
        icon: error ? 'ph--x-circle--regular' : 'ph--check-circle--regular',
        level: error ? LogLevel.ERROR : LogLevel.INFO,
        message: error ? `${toolName} - Error: ${trimText(error)}` : `${toolName} - Success`,
        timestamp: new Date(ts),
      },
      { replaceCommit: hasChildren ? undefined : startCommitId },
    );
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

  addOperationStart(id: string, operationName: string, meta: Trace.Meta, ts: number) {
    if (meta.pid) {
      this.#operationPidToStartCommitId.set(meta.pid, id);
    }
    this.#addCommit({
      id,
      branch: meta.conversationId ?? meta.pid ?? MAIN_BRANCH,
      parents: this.#defaultParents(MAIN_BRANCH),
      icon: 'ph--play--regular',
      level: LogLevel.INFO,
      message: operationName,
      timestamp: new Date(ts),
    });
  }

  addOperationEnd(
    id: string,
    operationName: string,
    outcome: 'success' | 'failure',
    error: string | undefined,
    meta: Trace.Meta,
    ts: number,
  ) {
    const isError = outcome === 'failure';
    const startCommitId = meta.pid && this.#operationPidToStartCommitId.get(meta.pid);
    const hasChildren = this.#commits.some((commit) => commit.parents?.includes(startCommitId!));
    this.#addCommit(
      {
        id,
        branch: meta.conversationId ?? meta.pid ?? MAIN_BRANCH,
        parents: this.#defaultParents(MAIN_BRANCH),
        icon: isError ? 'ph--x-circle--regular' : 'ph--check-circle--regular',
        level: isError ? LogLevel.ERROR : LogLevel.INFO,
        message: isError ? `${operationName}: ${error ?? 'Failed'}` : operationName,
        timestamp: new Date(ts),
      },
      {
        replaceCommit: hasChildren ? undefined : meta.pid && this.#operationPidToStartCommitId.get(meta.pid),
      },
    );
  }
}

const trimText = (text: string) => text.slice(0, 100).trim().split('\n')[0];
