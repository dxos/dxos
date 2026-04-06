//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { Avatar, Icon, Input, ScrollArea, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

type State = 'pending';

/**
 * Request or response.
 */
type Message = {
  type: 'request' | 'response';
  text?: string;
  data?: any;
  error?: Error;
};

export type TestPanelProps = ThemedClassName<{
  onInvoke?: (input: unknown) => Promise<unknown>;
}>;

// TODO(burdon): Need persistent history (currently lost when switching tabs).
export const TestPanel = composable<HTMLDivElement, TestPanelProps>(
  ({ classNames, onInvoke, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);

    const inputRef = useRef<HTMLInputElement>(null);
    const [input, setInput] = useState('');
    const [state, setState] = useState<State | null>(null);

    // TODO(burdon): Persistent history (thread).
    const [history, setHistory] = useState<Message[]>([]);

    const scrollerRef = useRef<HTMLDivElement>(null);
    const handleScroll = () => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }
    };

    const handleClear = () => {
      setInput('');
      setHistory([]);
      inputRef.current?.focus();
    };

    const handleResponse = ({
      text,
      data,
      error,
    }: {
      text?: string;
      data?: any;
      error?: Error;
    } = {}) => {
      setHistory((history) => [...history, { type: 'response', text, data, error } satisfies Message]);
      setState(null);
      handleScroll();
    };

    const handleRequest = async (input: string) => {
      if (!onInvoke) {
        handleResponse({ error: new Error('Function not deployed') });
        return;
      }

      let data: unknown = input;
      let displayText = input;
      if (input.charAt(0) === '{') {
        try {
          const validJsonString = input.replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
          data = JSON.parse(validJsonString);
          displayText = JSON.stringify(data, null, 2);
        } catch (err) {
          handleResponse({ error: new Error('Invalid JSON input') });
          return;
        }
      }

      try {
        setState('pending');
        setInput('');
        setHistory((history) => [...history, { type: 'request', text: displayText }]);
        setTimeout(handleScroll);

        const result = await onInvoke(data);

        if (typeof result === 'string') {
          handleResponse({ text: result });
        } else {
          handleResponse({ data: result });
        }
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        handleResponse({ error });
        log.catch(err);
      }
    };

    return (
      <div
        {...composableProps(props, { classNames: ['flex flex-col h-full overflow-hidden', classNames] })}
        ref={forwardedRef}
      >
        {/* TODO(burdon): Replace with Thread. */}
        <MessageThread ref={scrollerRef} state={state} history={history} />
        {/* TODO(burdon): Replace with Form based on the function's input schema. */}
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              ref={inputRef}
              autoFocus
              placeholder={t('function-request.placeholder')}
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && handleRequest(input)}
            />
          </Input.Root>
          <Toolbar.IconButton icon='ph--play--regular' label='Execute' iconOnly onClick={() => handleRequest(input)} />
          <Toolbar.IconButton icon='ph--trash--regular' label='Clear' iconOnly onClick={handleClear} />
        </Toolbar.Root>
      </div>
    );
  },
);

// TODO(burdon): Replace with thread?
// TODO(burdon): Button to edit/re-run question.
type MessageThreadProps = {
  state: State | null;
  history: Message[];
};

const MessageThread = forwardRef<HTMLDivElement, MessageThreadProps>(
  ({ state, history }: MessageThreadProps, forwardedRef) => {
    return (
      <ScrollArea.Root orientation='vertical' classNames='h-full' ref={forwardedRef}>
        <ScrollArea.Viewport classNames='gap-6 p-2'>
          {history.map((message, i) => (
            <div key={i} className='grid grid-cols-[2rem_1fr_2rem]'>
              <div className='p-1'>{message.type === 'response' && <RobotAvatar />}</div>
              <div className='overflow-auto'>
                <MessageItem message={message} />
              </div>
            </div>
          ))}

          {state === 'pending' && (
            <div className='grid grid-cols-[2rem_1fr_2rem]'>
              <div className='p-1'>
                <Icon icon='ph--spinner--regular' size={6} classNames='animate-spin' />
              </div>
            </div>
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

const MessageItem = ({ classNames, message }: ThemedClassName<{ message: Message }>) => {
  const { type, text, data, error } = message;
  const wrapper = 'p-1 px-2 rounded-md bg-hover-surface overflow-auto';
  return (
    <div className={mx('flex', type === 'request' ? 'ml-[1rem] justify-end' : 'mr-[1rem]', classNames)}>
      {error && <div className={mx(wrapper, 'whitespace-pre text-error-text')}>{String(error)}</div>}

      {text !== undefined && (
        <div className={mx(wrapper, type === 'request' && 'bg-primary-500 dark:bg-primary-600')}>
          {text || '\u00D8'}
        </div>
      )}

      {data && (
        <SyntaxHighlighter language='json' className={mx(wrapper, 'text-xs')}>
          {JSON.stringify(data, null, 2)}
        </SyntaxHighlighter>
      )}
    </div>
  );
};

const RobotAvatar = () => (
  <Avatar.Root>
    <Avatar.Content size={6} variant='circle' icon='ph--robot--regular' />
  </Avatar.Root>
);
