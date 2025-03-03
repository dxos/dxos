//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC, useState, useEffect } from 'react';

import { type MessageContentBlock, type Message } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { Button, ButtonGroup, Icon, IconButton, type ThemedClassName } from '@dxos/react-ui';
import { MarkdownViewer, ToggleContainer } from '@dxos/react-ui-components';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { safeParseJson } from '@dxos/util';

import { ToolBlock, isToolMessage } from './ToolInvocations';

// TODO(burdon): Create secondary token.
const userClassNames = 'bg-teal-200 dark:bg-teal-500';
const panelClassNames = 'flex flex-col w-full bg-groupSurface rounded-md';

const MessageContainer = ({ children, classNames, user }: ThemedClassName<PropsWithChildren<{ user?: boolean }>>) => {
  return (
    <div role='list-item' className={mx('flex w-full', user && 'justify-end', classNames)}>
      <div className={mx(user ? ['px-2 py-1 rounded-md', userClassNames] : 'w-full')}>{children}</div>
    </div>
  );
};

export type ThreadMessageProps = ThemedClassName<{
  message: Message;
  debug?: boolean;
  onPrompt?: (text: string) => void;
  onDelete?: (id: string) => void;
}>;

export const ThreadMessage: FC<ThreadMessageProps> = ({ classNames, message, onPrompt }) => {
  const { role, content = [] } = message;

  // TODO(burdon): Restructure types to make check unnecessary.
  if (isToolMessage(message)) {
    return (
      <MessageContainer classNames={classNames}>
        <ToolBlock classNames={panelClassNames} message={message} />
      </MessageContainer>
    );
  }

  return (
    <div role='none' className='flex flex-col gap-2'>
      {content.map((block, idx) => (
        <MessageContainer key={idx} classNames={classNames} user={block.type === 'text' && role === 'user'}>
          <Block block={block} onPrompt={onPrompt} />
        </MessageContainer>
      ))}
    </div>
  );
};

const Block: FC<{ block: MessageContentBlock; onPrompt?: (text: string) => void }> = ({ block, onPrompt }) => {
  const Component = components[block.type] ?? components.default;
  return <Component block={block} onPrompt={onPrompt} />;
};

type BlockComponent = FC<{ block: MessageContentBlock; onPrompt?: (text: string) => void }>;

const components: Record<string, BlockComponent> = {
  //
  // Text
  //
  ['text' as const]: ({ block }) => {
    invariant(block.type === 'text');
    const [open, setOpen] = useState(block.disposition === 'cot' && block.pending);
    const title = block.disposition ? titles[block.disposition] : undefined;
    if (!title) {
      return <MarkdownViewer content={block.text} />;
    }

    // Autoclose when streaming ends.
    useEffect(() => {
      if (block.disposition === 'cot' && !block.pending) {
        setOpen(false);
      }
    }, [block.disposition, block.pending]);

    return (
      <ToggleContainer
        open={open}
        title={title}
        icon={
          block.pending ? (
            <Icon icon={'ph--circle-notch--regular'} classNames='text-subdued ml-2 animate-spin' size={4} />
          ) : undefined
        }
        classNames={block.disposition === 'cot' && panelClassNames}
      >
        <MarkdownViewer
          content={block.text}
          classNames={['pbe-2', block.disposition === 'cot' && 'text-sm text-subdued']}
        />
      </ToggleContainer>
    );
  },

  //
  // JSON
  //
  ['json' as const]: ({ block, onPrompt }) => {
    invariant(block.type === 'json');

    switch (block.disposition) {
      // TODO(burdon): Make propts optional.
      case 'suggest': {
        const { text = '' }: { text: string } = safeParseJson(block.json ?? '{}') ?? ({} as any);
        return <IconButton icon='ph--lightning--regular' label={text} onClick={() => onPrompt?.(text)} />;
      }

      case 'select': {
        const { options = [] }: { options: string[] } = safeParseJson(block.json ?? '{}') ?? ({} as any);
        return (
          <ButtonGroup>
            {options.map((option) => (
              <Button key={option} onClick={() => onPrompt?.(option)}>
                {option}
              </Button>
            ))}
          </ButtonGroup>
        );
      }

      default: {
        const title = block.disposition ? titles[block.disposition] : undefined;
        return (
          <ToggleContainer title={title ?? 'JSON'}>
            <Json data={safeParseJson(block.json ?? block)} classNames='!p-1 text-xs' />
          </ToggleContainer>
        );
      }
    }
  },

  //
  // Default
  //
  default: ({ block }) => {
    let title = titles[block.type];
    if (block.type === 'tool_use') {
      title = `Tool [${block.name}]`; // TODO(burdon): Get label from tool.
    }

    return (
      <ToggleContainer title={title ?? 'JSON'}>
        <Json data={block} classNames='!p-1 text-xs' />
      </ToggleContainer>
    );
  },
};

const titles: Record<string, string> = {
  ['cot' as const]: 'Chain of thought',
  ['artifact' as const]: 'Artifact',
  ['tool_use' as const]: 'Tool request',
  ['tool_result' as const]: 'Tool result',
};
