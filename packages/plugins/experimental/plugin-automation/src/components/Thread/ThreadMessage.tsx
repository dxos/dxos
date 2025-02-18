//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { type MessageContentBlock, type Message } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { Button, ButtonGroup, Icon, type ThemedClassName } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { safeParseJson } from '@dxos/util';

import { ToggleContainer } from './ToggleContainer';
import { MarkdownViewer } from '../MarkdownViewer';

export type ThreadMessageProps = ThemedClassName<{
  message: Message;
  collapse?: boolean;
  debug?: boolean;
  onSuggest?: (text: string) => void;
  onDelete?: (id: string) => void;
}>;

export const ThreadMessage: FC<ThreadMessageProps> = ({
  classNames,
  message,
  collapse,
  debug,
  onSuggest,
  onDelete,
}) => {
  if (typeof message !== 'object') {
    return <div className={mx(classNames)}>{message}</div>;
  }

  const { role, content = [] } = message;
  return (
    <div className={mx('flex flex-col shrink-0 gap-2')}>
      {debug && (
        <div className='text-xs text-subdued'>
          {message.id}{' '}
          {onDelete && (
            <span className='cursor-pointer underline' onClick={() => onDelete(message.id)}>
              delete
            </span>
          )}
        </div>
      )}
      {content.map((block, idx) => (
        <div key={idx} className={mx('flex', classNames, block.type === 'text' && role === 'user' && 'justify-end')}>
          <Block role={role} block={block} onSuggest={onSuggest ?? (() => {})} />
        </div>
      ))}
    </div>
  );
};

const Block = ({
  block,
  role,
  onSuggest,
}: Pick<Message, 'role'> & { block: MessageContentBlock; onSuggest: (text: string) => void }) => {
  const Component = componentMap[block.type] ?? componentMap.default;
  return (
    <div
      className={mx(
        'p-1 px-2 overflow-hidden rounded-md',
        (block.type !== 'text' || block.disposition) && 'w-full bg-base',
        block.type === 'text' && role === 'user' && 'bg-blue-200 dark:bg-blue-800',
      )}
    >
      <Component block={block} onSuggest={onSuggest} />
    </div>
  );
};

const titles: Record<string, string> = {
  ['cot' as const]: 'Chain of thought',

  // TODO(burdon): Only show if debugging.
  ['tool_use' as const]: 'Tool request',
  ['tool_result' as const]: 'Tool result',

  ['artifact' as const]: 'Artifact',
};

type BlockComponent = FC<{ block: MessageContentBlock; onSuggest: (text: string) => void }>;

const componentMap: Record<string, BlockComponent> = {
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

  json: ({ block, onSuggest }) => {
    invariant(block.type === 'json');

    switch (block.disposition) {
      case 'suggest': {
        const { text = '' }: { text: string } = safeParseJson(block.json ?? '{}') ?? ({} as any);
        return <Button onClick={() => onSuggest(text)}>{text}</Button>;
      }
      case 'select': {
        const { options = [] }: { options: string[] } = safeParseJson(block.json ?? '{}') ?? ({} as any);
        return (
          <ButtonGroup>
            {options.map((option) => (
              <Button key={option} onClick={() => onSuggest(option)}>
                {option}
              </Button>
            ))}
          </ButtonGroup>
        );
      }
      default: {
        const title = block.disposition ? titles[block.disposition] : undefined;
        return (
          <ToggleContainer title={title ?? 'JSON'} toggle>
            <Json data={safeParseJson(block.json ?? block)} classNames='text-sm' />
          </ToggleContainer>
        );
      }
    }
  },

  default: ({ block }) => {
    let title = titles[block.type];
    if (block.type === 'tool_use') {
      title = `Tool [${block.name}]`; // TODO(burdon): Get label from tool.
    }
    return (
      <ToggleContainer title={title ?? 'JSON'} toggle>
        <Json data={block} classNames='text-sm' />
      </ToggleContainer>
    );
  },
};
