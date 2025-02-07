//
// Copyright 2025 DXOS.org
//

import React, {
  type KeyboardEventHandler,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type MessageContentBlock, type Message } from '@dxos/artifact';
import { Icon, Input, type ThemedClassName } from '@dxos/react-ui';
import { Ball } from '@dxos/react-ui-sfx';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { safeParseJson } from '@dxos/util';

import { MarkdownViewer } from './MarkdownViewer';

export type ThreadProps = {
  messages: Message[];
  streaming?: boolean;
  debug?: boolean;
  onSubmit: (message: string) => void;
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
            onSubmit(value);
            setText('');
            scroll();
          }
          break;
        }
      }
    },
    [text],
  );

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div ref={scrollRef} className='flex flex-col grow overflow-x-hidden overflow-y-scroll scrollbar-thin'>
        {messages.map((message) => (
          <ThreadMessage key={message.id} classNames='px-4 py-2' message={message} debug={debug} />
        ))}
      </div>

      <div className='flex p-4 gap-3 items-center'>
        <Ball active={streaming} />
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
    </div>
  );
};

export type ThreadMessageProps = ThemedClassName<{
  message: Message;
  debug?: boolean;
}>;

export const ThreadMessage = ({ classNames, message, debug }: ThreadMessageProps) => {
  if (typeof message !== 'object') {
    return <div className={mx(classNames)}>{message}</div>;
  }

  const { role, content = [] } = message;
  return (
    <div className={mx('flex', classNames, role === 'user' && 'justify-end')}>
      <div className={mx('flex flex-col gap-2')}>
        {debug && <div className='text-xs text-subdued'>{message.id}</div>}
        {content.map((block, idx) => (
          <Block key={idx} role={role} block={block} />
        ))}
      </div>
    </div>
  );
};

const Block = ({ role, block }: Pick<Message, 'role'> & { block: MessageContentBlock }) => {
  const content = useMemo(() => getContent(block), [block]);
  return (
    <div className={mx('p-1 px-2 overflow-hidden rounded-md', role === 'user' ? 'dark:bg-blue-800' : 'bg-base')}>
      {content}
    </div>
  );
};

const getContent = (block: MessageContentBlock) => {
  const titles: Record<string, string> = {
    ['cot' as const]: 'Chain of thought',
    ['tool_use' as const]: 'Tool',
  };

  // TODO(burdon): Pills: open/close.
  switch (block.type) {
    case 'text': {
      const title = block.disposition ? titles[block.disposition] : undefined;
      return (
        <Container title={title}>
          <MarkdownViewer content={block.text} classNames={[block.disposition === 'cot' && 'text-sm text-subdued']} />
        </Container>
      );
    }

    case 'json': {
      const title = block.disposition ? titles[block.disposition] : undefined;
      return (
        <Container title={title}>
          <Json data={safeParseJson(block.json)} />
        </Container>
      );
    }

    default: {
      return <Json data={block} />;
    }
  }
};

// TODO(burdon): Typewriter effect if streaming.
// TODO(burdon): Open/close is reset after streaming stops.
const Container = ({ title, children }: PropsWithChildren<{ title?: string }>) => {
  const [open, setOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {title && (
        <div
          className='flex gap-1 py-1 items-center text-sm text-subdued cursor-pointer'
          onClick={() => setOpen(!open)}
        >
          <Icon
            size={4}
            icon={'ph--caret-right--regular'}
            classNames={['transition transition-transform duration-200', open ? 'rotate-90' : 'transform-none']}
          />
          <span>{title}</span>
        </div>
      )}
      <div
        className={mx('transition-[height] duration-500 overflow-hidden')}
        style={{
          height: open ? `${contentRef.current?.scrollHeight}px` : '0px',
        }}
      >
        <div ref={contentRef} className={mx('transition-opacity duration-500', open ? 'opactity-100' : 'opacity-0')}>
          {children}
        </div>
      </div>
    </div>
  );
};

const Json = ({ data, classNames }: ThemedClassName<{ data: any }>) => {
  return (
    <SyntaxHighlighter language='json' classNames='w-full overflow-hidden text-sm'>
      {JSON.stringify(data, null, 2)}
    </SyntaxHighlighter>
  );
};
