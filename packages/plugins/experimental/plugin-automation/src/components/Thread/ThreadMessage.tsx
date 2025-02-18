//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type MessageContentBlock, type Message } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { safeParseJson } from '@dxos/util';

import { StatusLine } from './StatusLine';
import { ToggleContainer } from './ToggleContainer';
import { MarkdownViewer } from '../MarkdownViewer';

export type ThreadMessageProps = ThemedClassName<{
  message: Message;
  collapse?: boolean;
  debug?: boolean;
}>;

export const ThreadMessage: FC<ThreadMessageProps> = ({ classNames, message, collapse, debug }) => {
  if (typeof message !== 'object') {
    return <div className={mx(classNames)}>{message}</div>;
  }

  const { role, content = [] } = message;

  // TODO(burdon): Factor out tool blocks.
  const tools = content.filter((block) => block.type === 'tool_use' || block.type === 'tool_result');
  if (tools.length > 0) {
    const lines = tools.map((tool) => {
      switch (tool.type) {
        case 'tool_use':
          return `Calling ${tool.name}...`;
        case 'tool_result':
          return 'Processing results...';
        default:
          return 'Error';
      }
    });

    return (
      <div className={mx('flex', classNames)}>
        <div className='w-full p-1 px-2 overflow-hidden rounded-md bg-base'>
          <ToggleContainer title={<StatusLine lines={lines} autoAdvance />} toggle>
            <Json data={content[content.length - 1]} classNames='!p-1 text-xs' />
          </ToggleContainer>
        </div>
      </div>
    );
  }

  return (
    <div className={mx('flex flex-col shrink-0 gap-2')}>
      {debug && <div className='text-xs text-subdued'>{message.id}</div>}
      {content.map((block, idx) => (
        <div key={idx} className={mx('flex', classNames, block.type === 'text' && role === 'user' && 'justify-end')}>
          <Block role={role} block={block} />
        </div>
      ))}
    </div>
  );
};

const Block = ({ block, role }: Pick<Message, 'role'> & { block: MessageContentBlock }) => {
  const Component = componentMap[block.type] ?? componentMap.default;
  return (
    <div
      className={mx(
        'p-1 px-2 overflow-hidden rounded-md',
        (block.type !== 'text' || block.disposition) && 'w-full bg-base',
        block.type === 'text' && role === 'user' && 'bg-blue-200 dark:bg-blue-800',
      )}
    >
      <Component block={block} />
    </div>
  );
};

const titles: Record<string, string> = {
  ['cot' as const]: 'Chain of thought',

  // TODO(burdon): Only show if debugging.
  ['tool_use' as const]: 'Tool request',
  ['tool_result' as const]: 'Tool result',
};

const componentMap: Record<string, FC<{ block: MessageContentBlock }>> = {
  text: ({ block }) => {
    invariant(block.type === 'text');
    const title = block.disposition ? titles[block.disposition] : undefined;
    if (!title) {
      return (
        <MarkdownViewer content={block.text} classNames={[block.disposition === 'cot' && 'text-sm text-subdued']} />
      );
    }

    return (
      <ToggleContainer
        title={title}
        icon={
          block.pending ? (
            <Icon icon={'ph--circle-notch--regular'} classNames='text-subdued ml-2 animate-spin' size={4} />
          ) : undefined
        }
        defaultOpen={block.disposition === 'cot'}
        toggle
      >
        <MarkdownViewer content={block.text} classNames={[block.disposition === 'cot' && 'text-sm text-subdued']} />
      </ToggleContainer>
    );
  },

  json: ({ block }) => {
    invariant(block.type === 'json');
    const title = block.disposition ? titles[block.disposition] : undefined;
    return (
      <ToggleContainer title={title ?? 'JSON'} toggle>
        <Json data={safeParseJson(block.json ?? block)} classNames='!p-1 text-xs' />
      </ToggleContainer>
    );
  },

  default: ({ block }) => {
    let title = titles[block.type];
    if (block.type === 'tool_use') {
      title = `Tool [${block.name}]`; // TODO(burdon): Get label from tool.
    }

    return (
      <ToggleContainer title={title ?? 'JSON'} toggle>
        <Json data={block} classNames='!p-1 text-xs' />
      </ToggleContainer>
    );
  },
};
