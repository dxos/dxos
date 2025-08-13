//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Toolbar } from '@dxos/react-ui';

import { Timeline, type Branch, type Commit } from '../../components';

import { Filter, Obj, type Ref } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Assistant } from '../../types';
import { type ComponentProps } from './types';
import { DataType, type ContentBlock } from '@dxos/schema';
import { AgentStatus } from '@dxos/ai';
import { Match } from 'effect';
import type { ObjectId } from '@dxos/keys';
import { MESSAGE_PROPERTY_TOOL_CALL_ID } from '@dxos/functions';

export const LoggingContainer = ({ space }: ComponentProps) => {
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));
  const traceQueue = useQueue(chat?.traceQueue?.dxn);
  const { branches, commits } = reduceTraceEvents(traceQueue?.objects.filter(Obj.isObject) ?? []);

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>Timeline</Toolbar.Root>
      <Timeline branches={branches} commits={commits} />
    </div>
  );
};

// TODO(dmaretskyi): Extract.
function reduceTraceEvents(events: Obj.Any[]): { branches: Branch[]; commits: Commit[] } {
  const branchNames = new Set<string>();
  const commits: Commit[] = [];

  for (const event of events) {
    if (Obj.instanceOf(DataType.Message, event)) {
      const messageCommits = chatMessageToCommit(event);
      commits.push(...messageCommits);
      messageCommits.map((c) => c.branch).forEach((branch) => branchNames.add(branch));
    } else if (Obj.instanceOf(AgentStatus, event)) {
      const branch = getBranchName({ parentMessage: event.parentMessage, toolCallId: event.toolCallId });
      branchNames.add(branch);
      commits.push({
        id: event.id,
        branch,
        message: '⚡️' + event.message,
        parent:
          event.parentMessage && event.toolCallId ? getToolCallId(event.parentMessage, event.toolCallId) : undefined,
      });
    }
  }

  return {
    branches: Array.from(branchNames).map((name) => ({ name })),
    commits,
  };
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
