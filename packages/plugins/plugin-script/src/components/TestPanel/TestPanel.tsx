//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { Avatar, Icon, Input, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { errorText, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

type State = 'pending' | 'responding';

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
  functionUrl?: string;
}>;

// TODO(burdon): Need persistent history (currently lost when switching tabs)..
export const TestPanel = ({ classNames, functionUrl }: TestPanelProps) => {
  const { t } = useTranslation(meta.id);

  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [state, setState] = useState<State | null>(null);

  // TODO(burdon): Persistent history (thread).
  const [history, setHistory] = useState<Message[]>([]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  const controller = useRef<AbortController>(null);
  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  const handleStop = () => {
    controller.current?.abort('stop');
    controller.current = null;
  };

  const handleClear = () => {
    handleStop();
    setInput('');
    setResult('');
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
    controller.current = null;
    setHistory((history) => [...history, { type: 'response', text, data, error } satisfies Message]);
    setResult('');
    setState(null);
    handleScroll();
  };

  const handleRequest = async (input: string) => {
    // Returns a promise that resolves when a value has been received.
    try {
      setState('pending');

      let data = null;
      // Detect JSON input.
      if (input.charAt(0) === '{') {
        try {
          const validJsonString = input.replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
          data = JSON.parse(validJsonString);
          input = JSON.stringify(data, null, 2);
        } catch (err) {
          inputRef.current?.focus();
          return;
        }
      }

      setInput('');
      setResult('');
      setHistory((history) => [...history, { type: 'request', text: input }]);
      setTimeout(() => {
        handleScroll();
      });

      // Throws DOMException when aborted.
      controller.current = new AbortController();
      const response = await fetch(functionUrl!, {
        signal: controller.current.signal,
        method: 'POST',
        body: input,
        headers: {
          'Content-Type': data ? 'application/json' : 'text/plain',
        },
      });

      // Check for error.
      if (!response.ok) {
        const text = await response.text();
        handleResponse({
          error: new Error(text || response.statusText || String(response.status)),
        });
        return;
      }

      // Check for JSON.
      const contentType = response.headers.get('content-type');
      if (contentType === 'application/json') {
        const data = await response.json();
        handleResponse({ data });
        return;
      }

      // Text (including streaming).
      setState('responding');
      let text = '';
      const reader = response.body!.getReader();
      const pump = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
        text = text + new TextDecoder().decode(value);
        if (!controller.current || done) {
          handleResponse({ text });
          return;
        }

        setResult(text);
        setTimeout(() => {
          handleScroll();
        });

        return reader.read().then(pump);
      };

      void reader
        .read()
        .then(pump)
        .catch((err) => {
          if (err.name !== 'AbortError') {
            log.catch(err);
          }
        });
    } catch (err: any) {
      if (err !== 'stop') {
        const error = err instanceof Error ? err : new Error(err);
        handleResponse({ error });
        log.catch(err);
      } else {
        handleResponse();
      }
    }
  };

  return (
    <div className={mx('flex flex-col h-full overflow-hidden', classNames)}>
      {/* TODO(burdon): Replace with Thread. */}
      <MessageThread ref={scrollerRef} state={state} result={result} history={history} />
      {/* TODO(burdon): Replace with Form based on the function's input schema. */}
      <Toolbar.Root>
        <Input.Root>
          <Input.TextInput
            ref={inputRef}
            autoFocus
            placeholder={t('function request placeholder')}
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && handleRequest(input)}
          />
        </Input.Root>
        <Toolbar.IconButton
          icon='ph--play--regular'
          size={4}
          label='Execute'
          iconOnly
          onClick={() => handleRequest(input)}
        />
        <Toolbar.IconButton
          icon={state ? 'ph--stop--regular' : 'ph--trash--regular'}
          size={4}
          label={state ? 'Stop' : 'Clear'}
          iconOnly
          onClick={() => (state ? handleStop() : handleClear())}
        />
      </Toolbar.Root>
    </div>
  );
};

// TODO(burdon): Replace with thread?
// TODO(burdon): Button to edit/re-run question.
type MessageThreadProps = {
  state: State | null;
  history: Message[];
  result: string;
};

const MessageThread = forwardRef<HTMLDivElement, MessageThreadProps>(
  ({ state, history, result }: MessageThreadProps, forwardedRef) => {
    return (
      <div ref={forwardedRef} className='flex flex-col gap-6 h-full p-2 overflow-x-hidden overflow-y-auto'>
        {history.map((message, i) => (
          <div key={i} className='grid grid-cols-[2rem_1fr_2rem]'>
            <div className='p-1'>{message.type === 'response' && <RobotAvatar />}</div>
            <div className='overflow-auto'>
              <MessageItem message={message} />
            </div>
          </div>
        ))}

        {result?.length > 0 && (
          <div className='grid grid-cols-[2rem_1fr_2rem]'>
            <div className='p-1'>
              {(state === 'pending' && <Icon icon='ph--spinner--regular' size={6} classNames='animate-spin' />) || (
                <Icon icon='ph--robot--regular' size={6} classNames='animate-[pulse_1s_ease-in-out_infinite]' />
              )}
            </div>
            <div className='overflow-auto'>
              <MessageItem message={{ type: 'response', text: result }} />
            </div>
          </div>
        )}
      </div>
    );
  },
);

const MessageItem = ({ classNames, message }: ThemedClassName<{ message: Message }>) => {
  const { type, text, data, error } = message;
  const wrapper = 'p-1 px-2 rounded-md bg-hoverSurface overflow-auto';
  return (
    <div className={mx('flex', type === 'request' ? 'ml-[1rem] justify-end' : 'mr-[1rem]', classNames)}>
      {error && <div className={mx(wrapper, 'whitespace-pre', errorText)}>{String(error)}</div>}

      {text !== undefined && (
        <div className={mx(wrapper, type === 'request' && 'bg-primary-400 dark:bg-primary-600')}>
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
