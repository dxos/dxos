//
// Copyright 2025 DXOS.org
//

import { AgentStatus } from '@dxos/ai';
import { Obj, type Ref } from '@dxos/echo';
import { MESSAGE_PROPERTY_TOOL_CALL_ID } from '@dxos/functions';
import type { ObjectId } from '@dxos/keys';
import { DataType } from '@dxos/schema';

import { type Branch, type Commit } from '../components';

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
        const messageCommits = chatMessageToCommit(event);
        this._commits.push(...messageCommits);
        messageCommits.map((c) => c.branch).forEach((branch) => this._branchNames.add(branch));
      } else if (Obj.instanceOf(AgentStatus, event)) {
        const branch = getBranchName({ parentMessage: event.parentMessage, toolCallId: event.toolCallId });
        this._branchNames.add(branch);
        this._commits.push({
          id: event.id,
          branch,
          message: '⚡️' + event.message,
          parent:
            event.parentMessage && event.toolCallId ? getToolCallId(event.parentMessage, event.toolCallId) : undefined,
        });
      }
    }
  }

  /**
   * Returns the current state of the graph.
   */
  getGraph(): { commits: Commit[]; branches: Branch[] } {
    return {
      commits: this._commits,
      branches: Array.from(this._branchNames).map((name) => ({ name })),
    };
  }
}

const getToolCallId = (messageId: ObjectId, toolCallId: string) => `${messageId}_toolCall_${toolCallId}`;
const getToolResultId = (messageId: ObjectId, toolCallId: string) => `${messageId}_toolResult_${toolCallId}`;
const getGenericBlockId = (messageId: ObjectId, idx: number) => `${messageId}_block_${idx}`;

const getBranchName = (opts: { parentMessage?: ObjectId; toolCallId?: string }) => {
  if (opts.parentMessage && opts.toolCallId) {
    return `${opts.parentMessage}_${opts.toolCallId}`;
  } else if (opts.parentMessage) {
    return opts.parentMessage;
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

const chatMessageToCommit = (message: DataType.Message): Commit[] => {
  return message.blocks.map((block, idx) => {
    const branch = getMessageBranch(message);
    const parent = getParentId(message);
    switch (block._tag) {
      case 'toolCall':
        return {
          id: getToolCallId(message.id, block.toolCallId),
          branch,
          parent,
          message: '🔨' + block.name,
        };
      case 'toolResult':
        return {
          id: getToolResultId(message.id, block.toolCallId),
          branch,
          parent,
          message: block.error ? '❌ ' + block.error : '✅ ' + block.name,
        };
      case 'status':
        return {
          id: getGenericBlockId(message.id, idx),
          branch,
          parent,
          message: '⚡️' + block.statusText,
        };
      case 'reasoning':
        return {
          id: getGenericBlockId(message.id, idx),
          branch,
          parent,
          message: '💭' + (block.reasoningText ?? 'Thinking...'),
        };
      case 'text':
        return {
          id: getGenericBlockId(message.id, idx),
          branch,
          parent,
          message:
            message.sender.role === 'user' ? `👤 ${ellipsisEnd(block.text, 64)}` : `🤖 ${ellipsisEnd(block.text, 64)}`,
        };
      case 'reference':
        return {
          id: getGenericBlockId(message.id, idx),
          branch,
          parent,
          message: '🔗' + stringifyRef(block.reference),
        };
      default:
        return {
          id: getGenericBlockId(message.id, idx),
          branch,
          parent,
          message: '❓' + block._tag,
        };
    }
  });
};

const ellipsisEnd = (str: string, length: number) => {
  if (str.length > length) {
    return str.slice(0, length - 1) + '…';
  }
  return str;
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
