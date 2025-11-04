//
// Copyright 2025 DXOS.org
//

import { AgentStatus } from '@dxos/ai';
import { Obj, type Ref } from '@dxos/echo';
import { MESSAGE_PROPERTY_TOOL_CALL_ID } from '@dxos/functions';
import { type ObjectId } from '@dxos/keys';
import { LogLevel } from '@dxos/log';
import { DataType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

const SKIP_BLOCKS: DataType.ContentBlock.Any['_tag'][] = ['text'];

/**
 * Mercurial-style Commit.
 */
// TODO(wittjosiah): Reconcile with @dxos/react-ui-components.
export type Commit = {
  id: string;
  parents: string[];
  branch: string;
  icon?: string;
  level?: LogLevel;
  message: string;
  timestamp?: Date;
  tags?: string[];
};

// TODO(burdon): Add colors?
enum IconType {
  // General status.
  SUCCESS = 'ph--check-circle--regular',
  WARNING = 'ph--warning-circle--regular',
  ERROR = 'ph--x-circle--regular',
  FLAG = 'ph--flag--regular',
  ROCKET = 'ph--rocket--regular',
  TIMER = 'ph--timer--regular',

  // Interactions.
  USER = 'ph--user--regular',
  USER_INTERACTION = 'ph--user-sound--regular',
  AGENT = 'ph--robot--regular',
  THINKING = 'ph--brain--regular',
  LINK = 'ph--link--regular',
  TOOL = 'ph--wrench--regular',
}

/**
 * Models the execution graph based on a stream of events.
 */
export class ExecutionGraph {
  // TODO(dmaretskyi): Evolve the internal state to support chats, functions, circuit workflows, etc.
  private _commits: Commit[] = [];
  private _branchNames = new Set<string>();
  private _lastBlockId: string | undefined;

  // Tool call tracking.
  private _toolCallCommitIds = new Map<string, string>(); // toolCallId -> commitId
  private _lastCommitByBranch = new Map<string, string>(); // branch -> last commitId
  private _pendingToolResults = new Map<string, string>(); // toolCallId -> toolResultCommitId

  constructor(private readonly _skipBlocks: DataType.ContentBlock.Any['_tag'][] = SKIP_BLOCKS) {}

  /**
   * Adds events to the graph.
   */
  addEvents(events: Obj.Any[]) {
    const sortedEvents = this.sortObjectsByCreated(events);
    for (const event of sortedEvents) {
      if (Obj.instanceOf(DataType.Message.Message, event)) {
        this._processMessage(event);
      } else if (Obj.instanceOf(AgentStatus, event)) {
        this._processAgentStatus(event);
      }
    }
  }

  /**
   * Processes a message event and creates commits for its blocks.
   */
  private _processMessage(message: DataType.Message.Message) {
    const messageCommits = messageToCommits(
      message,
      this._lastBlockId,
      this._toolCallCommitIds,
      this._lastCommitByBranch,
      this._skipBlocks,
    );
    this._commits.push(...messageCommits);

    // Track branches.
    messageCommits.forEach((commit) => this._branchNames.add(commit.branch));

    // Track tool calls and update pending tool results.
    this._trackToolCalls(messageCommits);

    // Update last block ID for sequential chaining.
    if (messageCommits.length > 0) {
      this._lastBlockId = messageCommits[messageCommits.length - 1].id;
    }
  }

  /**
   * Processes an AgentStatus event.
   */
  private _processAgentStatus(event: AgentStatus) {
    const branch = this._getToolCallBranch(event.parentMessage, event.toolCallId);
    this._branchNames.add(branch);

    const agentStatusCommit: Commit = {
      id: event.id,
      branch,
      message: event.message,
      icon: IconType.FLAG,
      parents: this._getAgentStatusParents(event),
      timestamp: new Date(event.created),
    };

    this._commits.push(agentStatusCommit);

    // Update last block ID for sequential chaining.
    this._lastBlockId = event.id;

    // Update pending tool results to point to this AgentStatus.
    if (event.toolCallId) {
      this._lastCommitByBranch.set(branch, event.id);
      this._updatePendingToolResults(event.toolCallId, event.id);
    }
  }

  /**
   * Stable sort: objects with 'created' field are sorted by it, others remain in place.
   */
  private sortObjectsByCreated(objects: any[]) {
    const sortedObjects = objects.slice();
    // Find indices of objects with 'created'
    const createdObjects: { idx: number; obj: any }[] = [];
    sortedObjects.forEach((obj, idx) => {
      if (obj && typeof obj.created === 'string') {
        createdObjects.push({ idx, obj });
      }
    });
    // Sort only the objects with 'created' by their date, stable
    createdObjects.sort((a, b) => {
      const aDate = new Date(a.obj.created).getTime();
      const bDate = new Date(b.obj.created).getTime();
      return aDate - bDate;
    });
    // Place sorted createdObjects back into their original positions
    let createdIdx = 0;
    return sortedObjects.map((obj, _idx) => {
      if (obj && typeof obj.created === 'string') {
        return createdObjects[createdIdx++].obj;
      }
      return obj;
    });
  }

  /**
   * Returns the current state of the graph.
   */
  getGraph(lastRequest = false): { branches: string[]; commits: Commit[] } {
    const idx = lastRequest ? this._commits.findLastIndex((c) => c.tags?.includes('user')) : -1;
    const commits = idx === -1 ? this._commits : this._commits.slice(idx);

    return {
      branches: Array.from(this._branchNames),
      commits,
    };
  }

  /**
   * Tracks tool calls and handles pending tool result updates.
   */
  private _trackToolCalls(commits: Commit[]) {
    commits.forEach((commit) => {
      if (this._isToolCallCommit(commit)) {
        const toolCallId = this._extractToolCallId(commit.id);
        if (toolCallId) {
          this._toolCallCommitIds.set(toolCallId, commit.id);
        }
      }

      if (this._isToolResultCommit(commit)) {
        const toolCallId = this._extractToolCallId(commit.id);
        if (toolCallId) {
          this._pendingToolResults.set(toolCallId, commit.id);
          this._handleLateToolResultUpdate(toolCallId, commit.id);
        }
      }

      this._lastCommitByBranch.set(commit.branch, commit.id);
    });
  }

  /**
   * Updates pending tool results to point to an AgentStatus event.
   */
  private _updatePendingToolResults(toolCallId: string, agentStatusId: string) {
    const toolResultId = this._pendingToolResults.get(toolCallId);
    if (!toolResultId) return;

    const toolResultCommit = this._commits.find((c) => c.id === toolResultId);
    if (!toolResultCommit) return;

    const toolCallCommitId = this._toolCallCommitIds.get(toolCallId);
    if (!toolCallCommitId) return;

    // Replace tool call commit with AgentStatus commit.
    const toolCallIndex = toolResultCommit.parents.indexOf(toolCallCommitId);
    if (toolCallIndex !== -1) {
      toolResultCommit.parents[toolCallIndex] = agentStatusId;
    }

    this._pendingToolResults.delete(toolCallId);
  }

  /**
   * Handles late updates when AgentStatus is processed before tool result.
   */
  private _handleLateToolResultUpdate(toolCallId: string, toolResultId: string) {
    const toolCallCommitId = this._toolCallCommitIds.get(toolCallId);
    if (!toolCallCommitId) return;

    const messageId = toolCallCommitId.split('_toolCall_')[0];
    const toolCallBranch = `${messageId}_${toolCallId}`;
    const agentStatusCommitId = this._lastCommitByBranch.get(toolCallBranch);

    if (agentStatusCommitId && agentStatusCommitId !== toolCallCommitId) {
      const toolResultCommit = this._commits.find((c) => c.id === toolResultId);
      if (toolResultCommit) {
        const toolCallIndex = toolResultCommit.parents.indexOf(toolCallCommitId);
        if (toolCallIndex !== -1) {
          toolResultCommit.parents[toolCallIndex] = agentStatusCommitId;
        }
      }
      this._pendingToolResults.delete(toolCallId);
    }
  }

  /**
   * Gets the branch name for a tool call.
   */
  private _getToolCallBranch(parentMessage?: ObjectId, toolCallId?: string): string {
    if (toolCallId) {
      return toolCallId;
    }
    return parentMessage || 'main';
  }

  /**
   * Gets the parents for an AgentStatus commit.
   */
  private _getAgentStatusParents(event: AgentStatus): string[] {
    if (event.parentMessage && event.toolCallId) {
      return [getToolCallId(event.parentMessage, event.toolCallId)];
    }
    return [];
  }

  /**
   * Checks if a commit is a tool call commit.
   */
  private _isToolCallCommit(commit: Commit): boolean {
    return commit.message.includes('Calling tool');
  }

  /**
   * Checks if a commit is a tool result commit.
   */
  private _isToolResultCommit(commit: Commit): boolean {
    return commit.message.includes('Tool call succeeded') || commit.message.includes('Tool error:');
  }

  /**
   * Extracts tool call ID from a commit ID.
   */
  private _extractToolCallId(commitId: string): string | undefined {
    const toolCallMatch = commitId.match(/_toolCall_(.+)$/);
    const toolResultMatch = commitId.match(/_toolResult_(.+)$/);
    return toolCallMatch?.[1] || toolResultMatch?.[1];
  }
}

/**
 * Creates commits for all blocks in a message.
 */
// TODO(burdon): Pass in AiToolProvider.
const messageToCommits = (
  message: DataType.Message.Message,
  lastBlockId?: string,
  toolCallIds?: Map<string, string>,
  lastCommitByBranch?: Map<string, string>,
  skipBlocks?: DataType.ContentBlock.Any['_tag'][],
): Commit[] => {
  let previousBlockId: string | undefined = lastBlockId;

  return message.blocks
    .map((block, idx) => {
      const branch = getMessageBranch(message);
      const parents = getBlockParents(block, previousBlockId, message, toolCallIds, lastCommitByBranch);
      if (skipBlocks?.includes(block._tag)) {
        return null;
      }

      const commit = createBlockCommit(block, message, branch, parents, idx);
      if (commit) {
        previousBlockId = commit.id;
      }

      return commit;
    })
    .filter(isNonNullable);
};

/**
 * Determines the parent commits for a block based on its type and context.
 */
const getBlockParents = (
  block: DataType.ContentBlock.Any,
  previousBlockId: string | undefined,
  message: DataType.Message.Message,
  toolCallIds?: Map<string, string>,
  lastCommitByBranch?: Map<string, string>,
): string[] => {
  const parents: string[] = [];

  if (block._tag === 'toolResult') {
    // Tool results have two parents: previous block and last block from tool call branch.
    if (previousBlockId) {
      parents.push(previousBlockId);
    }

    const toolCallCommitId = toolCallIds?.get(block.toolCallId);
    if (toolCallCommitId) {
      const toolCallBranch = getToolCallBranchFromCommitId(toolCallCommitId, block.toolCallId);
      const lastBlockFromToolCallBranch = lastCommitByBranch?.get(toolCallBranch);

      if (lastBlockFromToolCallBranch) {
        parents.push(lastBlockFromToolCallBranch);
      } else {
        // Fallback to tool call commit if no AgentStatus exists yet.
        parents.push(toolCallCommitId);
      }
    }
  } else {
    // For other blocks, use previous block as parent (or tool call parent for first block).
    if (previousBlockId) {
      parents.push(previousBlockId);
    } else {
      const toolCallParent = getParentId(message);
      if (toolCallParent) {
        parents.push(toolCallParent);
      }
    }
  }

  return parents;
};

/**
 * Creates a commit for a specific block.
 */
const createBlockCommit = (
  block: DataType.ContentBlock.Any,
  message: DataType.Message.Message,
  branch: string,
  parents: string[],
  idx: number,
): Commit | null => {
  const timestamp = new Date(message.created);
  switch (block._tag) {
    case 'text':
      if (!block.text.trim().length) return null;
      return {
        id: getGenericBlockId(message.id, idx),
        branch,
        parents,
        timestamp,
        ...(message.sender.role === 'user'
          ? {
              icon: IconType.USER,
              tags: ['user'],
              message: 'Processing request...',
            }
          : {
              icon: IconType.AGENT,
              message: `Response (${block.text.split(' ').length} words)`,
            }),
      } satisfies Commit;

    case 'toolCall':
      return {
        id: getToolCallId(message.id, block.toolCallId),
        branch,
        parents,
        timestamp,
        icon: IconType.TOOL,
        level: LogLevel.INFO,
        message: `Calling tool (${block.name})`,
      } satisfies Commit;

    case 'toolResult':
      return {
        id: getToolResultId(message.id, block.toolCallId),
        branch,
        parents,
        timestamp,
        icon: block.error ? IconType.ERROR : IconType.SUCCESS,
        level: block.error ? LogLevel.ERROR : LogLevel.INFO,
        message: block.error ? 'Tool error: ' + block.error : 'Tool call succeeded',
      } satisfies Commit;

    case 'summary':
      return {
        id: getGenericBlockId(message.id, idx),
        branch,
        parents,
        timestamp,
        icon: IconType.ROCKET,
        level: LogLevel.INFO,
        message: DataType.ContentBlock.createSummaryMessage(block),
      } satisfies Commit;

    case 'status':
      return {
        id: getGenericBlockId(message.id, idx),
        branch,
        parents,
        timestamp,
        message: block.statusText,
        level: LogLevel.INFO,
        icon: IconType.FLAG,
      } satisfies Commit;

    case 'reasoning':
      return {
        id: getGenericBlockId(message.id, idx),
        branch,
        parents,
        timestamp,
        message: block.reasoningText ?? 'Thinking...',
        icon: IconType.THINKING,
      } satisfies Commit;

    case 'reference':
      return {
        id: getGenericBlockId(message.id, idx),
        branch,
        parents,
        timestamp,
        icon: IconType.LINK,
        message: stringifyRef(block.reference),
      } satisfies Commit;

    default:
      return null;
  }
};

/**
 * Gets the tool call branch name from a tool call commit ID.
 */
const getToolCallBranchFromCommitId = (toolCallCommitId: string, toolCallId: string): string => {
  const messageId = toolCallCommitId.split('_toolCall_')[0];
  return `${messageId}_${toolCallId}`;
};

const getToolCallId = (messageId: ObjectId, toolCallId: string) => `${messageId}_toolCall_${toolCallId}`;
const getToolResultId = (messageId: ObjectId, toolCallId: string) => `${messageId}_toolResult_${toolCallId}`;
const getGenericBlockId = (messageId: ObjectId, idx: number) => `${messageId}_block_${idx}`;

const getBranchName = (options: { parentMessage?: ObjectId; toolCallId?: string }) => {
  if (options.toolCallId) {
    return options.toolCallId;
  } else if (options.parentMessage) {
    return options.parentMessage;
  } else {
    return 'main';
  }
};

const getMessageBranch = (message: DataType.Message.Message) => {
  return getBranchName({
    parentMessage: message.parentMessage,
    toolCallId: message.properties?.[MESSAGE_PROPERTY_TOOL_CALL_ID],
  });
};

const getParentId = (message: DataType.Message.Message) => {
  if (message.parentMessage && message.properties?.[MESSAGE_PROPERTY_TOOL_CALL_ID]) {
    return getToolCallId(message.parentMessage, message.properties[MESSAGE_PROPERTY_TOOL_CALL_ID]);
  } else {
    return undefined;
  }
};

const stringifyRef = (ref: Ref.Any) => {
  if (ref.target) {
    return stringifyObject(ref.target);
  }

  return ref.dxn.asEchoDXN()?.echoId ?? ref.dxn.asQueueDXN()?.objectId ?? '';
};

const stringifyObject = (obj: Obj.Any) => {
  return Obj.getLabel(obj) ?? Obj.getTypename(obj) ?? obj.id;
};
