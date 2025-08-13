//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Toolbar } from '@dxos/react-ui';

import { Timeline, type Branch, type Commit } from '../../components';

import { Filter, Obj } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Assistant } from '../../types';
import { type ComponentProps } from './types';
import { DataType } from '@dxos/schema';
import { AgentStatus } from '@dxos/ai';

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

function reduceTraceEvents(events: Obj.Any[]): { branches: Branch[]; commits: Commit[] } {
  const branchNames = new Set<string>();
  const commits: Commit[] = [];

  for (const event of events) {
    if (Obj.instanceOf(DataType.Message, event)) {
      branchNames.add(event.parentMessage ?? 'main');
      commits.push(...chatMessageToCommit(event));
    } else if (Obj.instanceOf(AgentStatus, event)) {
      branchNames.add(event.parentMessage ?? 'main');
      commits.push({
        id: event.id,
        branch: event.parentMessage ?? 'main',
        message: event.message,
        parent: event.parentMessage,
      });
    } else {
      const parent = String('parentMessage' in event ? event.parentMessage : 'main');
      branchNames.add(parent);
      commits.push({
        id: event.id,
        branch: parent,
        message: Obj.getLabel(event) ?? Obj.getTypename(event) ?? event.id,
        parent,
      });
    }
  }

  return {
    branches: Array.from(branchNames).map((name) => ({ name })),
    commits,
  };
}

const chatMessageToCommit = (message: DataType.Message): Commit[] => {
  return message.blocks.map((block, idx) => {
    // Last block acts as an anchor for sub-blocks.
    const id = idx === message.blocks.length - 1 ? message.id : `${message.id}_${idx}`;
    const branch = message.parentMessage ?? 'main';
    switch (block._tag) {
      case 'toolCall':
        return {
          id,
          branch,
          parent: message.parentMessage,
          message: '→ ' + block.name,
        };
      case 'toolResult':
        return {
          id,
          branch,
          parent: message.parentMessage,
          message: '← ' + block.name,
        };
      case 'status':
        return {
          id,
          branch,
          parent: message.parentMessage,
          message: block.statusText,
        };
      case 'reasoning':
        return {
          id,
          branch,
          parent: message.parentMessage,
          message: block.reasoningText ?? 'Thinking...',
        };
      case 'text':
        return {
          id,
          branch: message.parentMessage ?? 'main',
          parent: message.parentMessage,
          message:
            message.sender.role === 'user' ? `[USER] ${ellipsisEnd(block.text, 32)}` : ellipsisEnd(block.text, 32),
        };
      default:
        return {
          id,
          branch,
          parent: message.parentMessage,
          message: block._tag,
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
