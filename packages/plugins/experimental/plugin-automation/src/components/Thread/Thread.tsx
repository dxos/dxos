//
// Copyright 2025 DXOS.org
//

import React, { type FC, type KeyboardEventHandler, useCallback, useEffect, useRef, useState } from 'react';

import { type MessageContentBlock, type Message } from '@dxos/artifact';
import { Icon, Input, type ThemedClassName } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { safeParseJson } from '@dxos/util';

import { MarkdownViewer } from '../MarkdownViewer';
import { ToggleContainer } from '../ToggleContainer';

export type ThreadProps = {
  messages: Message[];
  streaming?: boolean;
  debug?: boolean;
  onSubmit?: (message: string) => void;
};

export const Thread = ({ messages, streaming, debug, onSubmit }: ThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  useEffect(() => {
    const t = setTimeout(() => scroll(), 100);
    return () => clearTimeout(t);
  }, [messages]);

  const [text, setText] = useState('');
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
      switch (ev.key) {
        case 'Escape': {
          setText('');
          break;
        }

        case 'Enter': {
          const value = text.trim();
          if (value.length > 0) {
            onSubmit?.(value);
            setText('');
            scroll();
          }
          break;
        }
      }
    },
    [text],
  );

  // TODO(burdon): Custom scrollbar.
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div ref={scrollRef} className='flex flex-col gap-2 py-2 grow overflow-x-hidden overflow-y-scroll scrollbar-none'>
        {messages.map((message) => (
          <ThreadMessage key={message.id} classNames='px-4' message={message} debug={debug} />
        ))}
      </div>

      {onSubmit && (
        <div className='flex p-4 gap-3 items-center'>
          <Spinner active={streaming} />
          <Input.Root>
            <Input.TextInput
              autoFocus
              classNames='px-2 bg-base rounded'
              placeholder='Ask a question...'
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={handleKeyDown}
            />
          </Input.Root>
          <Icon
            icon={'ph--spinner-gap--regular'}
            classNames={mx('animate-spin opacity-0 transition duration-500', streaming && 'opacity-100')}
            size={6}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Message with blocks.
 */
export const ThreadMessage: FC<
  ThemedClassName<{
    message: Message;
    debug?: boolean;
  }>
> = ({ classNames, message, debug }) => {
  if (typeof message !== 'object') {
    return <div className={mx(classNames)}>{message}</div>;
  }

  const { role, content = [] } = message;
  return (
    <div className={mx('flex flex-col gap-2 overflow-hidden')}>
      {debug && <div className='text-xs text-subdued'>{message.id}</div>}
      {content.map((block, idx) => (
        <div key={idx} className={mx('flex', classNames, block.type === 'text' && role === 'user' && 'justify-end')}>
          <Block id={String(idx)} role={role} block={block} />
        </div>
      ))}
    </div>
  );
};

// TODO(burdon): Need block.id to prevent flickering.
const Block = ({ id, block, role }: Pick<Message, 'role'> & { id: string; block: MessageContentBlock }) => {
  const content = getContent(block);
  return (
    <div
      className={mx(
        'p-1 px-2 overflow-hidden rounded-md',
        block.type === 'text' && role === 'user' ? 'dark:bg-blue-800' : 'bg-base',
      )}
    >
      {content}
    </div>
  );
};

const getContent = (block: MessageContentBlock) => {
  const titles: Record<string, string> = {
    ['cot' as const]: 'Chain of thought',
    ['tool_use' as const]: 'Tool request',
    ['tool_result' as const]: 'Tool result',
  };

  // TODO(burdon): Pills: open/close.
  switch (block.type) {
    case 'text': {
      const title = block.disposition ? titles[block.disposition] : undefined;
      if (title) {
        return (
          <ToggleContainer title={title} toggle>
            <MarkdownViewer content={block.text} classNames={[block.disposition === 'cot' && 'text-sm text-subdued']} />
          </ToggleContainer>
        );
      } else {
        return (
          <MarkdownViewer content={block.text} classNames={[block.disposition === 'cot' && 'text-sm text-subdued']} />
        );
      }
    }

    case 'json': {
      const title = block.disposition ? titles[block.disposition] : undefined;
      return (
        <ToggleContainer title={title ?? 'JSON'} toggle>
          <Json data={safeParseJson(block.json ?? block)} />
        </ToggleContainer>
      );
    }

    default: {
      const title = titles[block.type];
      return (
        <ToggleContainer title={title ?? 'JSON'} toggle>
          <Json data={block} />
        </ToggleContainer>
      );
    }
  }
};

const Json = ({ data, classNames }: ThemedClassName<{ data: any }>) => {
  return (
    <SyntaxHighlighter language='json' classNames={mx('overflow-hidden text-sm', classNames)}>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};
