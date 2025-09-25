//
// Copyright 2025 DXOS.org
//

import { AgentStatus } from '@dxos/ai';
import { Obj, type Ref } from '@dxos/echo';
import { MESSAGE_PROPERTY_TOOL_CALL_ID } from '@dxos/functions';
import { type ObjectId } from '@dxos/keys';
import { LogLevel } from '@dxos/log';
import { type Commit } from '@dxos/react-ui-components';
import { ContentBlock, DataType } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

// TODO(burdon): Move to assistant.

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

  /**
   * Adds events to the graph.
   */
  addEvents(events: Obj.Any[]) {
    for (const event of events) {
      if (Obj.instanceOf(DataType.Message, event)) {
        const messageCommits = messageToCommit(event);
        this._commits.push(...messageCommits);
        messageCommits.map((c) => c.branch).forEach((branch) => this._branchNames.add(branch));
      } else if (Obj.instanceOf(AgentStatus, event)) {
        const branch = getBranchName({ parentMessage: event.parentMessage, toolCallId: event.toolCallId });
        this._branchNames.add(branch);
        this._commits.push({
          id: event.id,
          branch,
          message: event.message,
          icon: IconType.FLAG,
          parents:
            event.parentMessage && event.toolCallId
              ? [getToolCallId(event.parentMessage, event.toolCallId)]
              : undefined, // TODO(burdon): Fix.
        });
      }
    }
  }

  /**
   * Returns the current state of the graph.
   */
  getGraph(lastRequest = false): { branches: string[]; commits: Commit[] } {
    const idx = lastRequest ? this._commits.findLastIndex((c) => c.tags?.includes('user')) : -1;
    const commits = idx === -1 ? this._commits : this._commits.slice(idx);

    return {
      branches: Array.from(this._branchNames),
      commits: commits,
    };
  }
}

// TODO(burdon): Pass in AiToolProvider.
const messageToCommit = (message: DataType.Message): Commit[] => {
  return message.blocks
    .map((block, idx) => {
      const branch = getMessageBranch(message);
      const parent = getParentId(message);
      const parents = parent ? [parent] : [];
      switch (block._tag) {
        case 'text':
          if (!block.text.trim().length) {
            return null;
          }
          return {
            id: getGenericBlockId(message.id, idx),
            branch,
            parents,
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
            icon: IconType.TOOL,
            level: LogLevel.INFO,
            // TODO(burdon): Lookup tool name/description?
            message: `Calling tool (${block.name})`,
          } satisfies Commit;
        case 'toolResult':
          return {
            id: getToolResultId(message.id, block.toolCallId),
            branch,
            parents,
            icon: block.error ? IconType.ERROR : IconType.SUCCESS,
            level: block.error ? LogLevel.ERROR : LogLevel.INFO,
            message: block.error ? 'Tool error: ' + block.error : 'Tool call succeeded',
          } satisfies Commit;
        case 'summary':
          return {
            id: getGenericBlockId(message.id, idx),
            branch,
            parents,
            icon: IconType.ROCKET,
            level: LogLevel.INFO,
            message: ContentBlock.createSummaryMessage(block),
          } satisfies Commit;
        case 'status':
          return {
            id: getGenericBlockId(message.id, idx),
            branch,
            parents,
            message: block.statusText,
            level: LogLevel.INFO,
            icon: IconType.FLAG,
          } satisfies Commit;
        case 'reasoning':
          return {
            id: getGenericBlockId(message.id, idx),
            branch,
            parents,
            message: block.reasoningText ?? 'Thinking...',
            icon: IconType.THINKING,
          } satisfies Commit;
        case 'reference':
          return {
            id: getGenericBlockId(message.id, idx),
            branch,
            parents,
            icon: IconType.LINK,
            message: stringifyRef(block.reference),
          } satisfies Commit;
        default:
          return null;
      }
    })
    .filter(isTruthy);
};

const getToolCallId = (messageId: ObjectId, toolCallId: string) => `${messageId}_toolCall_${toolCallId}`;

const getToolResultId = (messageId: ObjectId, toolCallId: string) => `${messageId}_toolResult_${toolCallId}`;

const getGenericBlockId = (messageId: ObjectId, idx: number) => `${messageId}_block_${idx}`;

const getBranchName = (options: { parentMessage?: ObjectId; toolCallId?: string }) => {
  if (options.parentMessage && options.toolCallId) {
    return `${options.parentMessage}_${options.toolCallId}`;
  } else if (options.parentMessage) {
    return options.parentMessage;
  } else {
    return 'main';
  }
};

const getMessageBranch = (message: DataType.Message) => {
  return getBranchName({
    parentMessage: message.parentMessage,
    toolCallId: message.properties?.[MESSAGE_PROPERTY_TOOL_CALL_ID],
  });
};

const getParentId = (message: DataType.Message) => {
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
