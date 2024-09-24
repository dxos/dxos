//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import {
  Avatar,
  DensityProvider,
  Icon,
  Input,
  type ThemedClassName,
  Toolbar,
  useControlledValue,
  useTranslation,
} from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../../meta';

type State = 'pending' | 'responding';

/**
 * Request or response.
 */
type Message = { type: 'request' | 'response'; text?: string; data?: any; error?: Error };

export type DebugPanelProps = ThemedClassName<{
  functionUrl?: string;
  binding?: string;
  onBindingChange?: (binding: string) => void;
}>;

export const DebugPanel = ({ classNames, functionUrl, binding: _binding, onBindingChange }: DebugPanelProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);

  const bindingInputRef = useRef<HTMLInputElement>(null);
  const [binding, setBinding] = useControlledValue(_binding ?? '');
  const handleBlur = () => {
    onBindingChange?.(binding);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [state, setState] = useState<State | null>(null);

  // TODO(burdon): Persistent history -- at least for session (non-space ECHO data?)
  const [history, setHistory] = useState<Message[]>([]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const handleScroll = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  const controller = useRef<AbortController>();
  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  const handleStop = () => {
    controller.current?.abort('stop');
    controller.current = undefined;
  };

  const handleClear = () => {
    handleStop();
    setInput('');
    setResult('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleResponse = ({ text, data, error }: { text?: string; data?: any; error?: Error } = {}) => {
    controller.current = undefined;
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
        handleResponse({ error: new Error(text || response.statusText || String(response.status)) });
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
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col h-full overflow-hidden', classNames)}>
        {/* TODO(burdon): Replace with Thread? */}
        <div ref={scrollerRef} className='flex flex-col gap-6 h-full p-4 overflow-x-hidden overflow-y-auto'>
          <MessageThread state={state} result={result} history={history} />
        </div>

        <Toolbar.Root classNames='p-2'>
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
          <Input.Root>
            <Input.TextInput
              ref={bindingInputRef}
              classNames='!w-[10rem]'
              placeholder={t('binding placeholder')}
              value={binding}
              onChange={(ev) => setBinding(ev.target.value.toUpperCase())}
              onBlur={handleBlur}
            />
          </Input.Root>
          <Toolbar.Button onClick={() => handleRequest(input)}>
            <Icon icon='ph--play--regular' size={4} />
          </Toolbar.Button>
          <Toolbar.Button onClick={() => (state ? handleStop() : handleClear())}>
            <Icon icon={state ? 'ph--stop--regular' : 'ph--trash--regular'} size={4} />
          </Toolbar.Button>
        </Toolbar.Root>
      </div>
    </DensityProvider>
  );
};

const RobotAvatar = () => (
  <Avatar.Root size={6} variant='circle'>
    <Avatar.Frame>
      <Avatar.Icon icon='ph--robot--regular' />
    </Avatar.Frame>
  </Avatar.Root>
);

const MessageItem = ({ classNames, message }: ThemedClassName<{ message: Message }>) => {
  const { text, data, error } = message;
  if (error) {
    return <span className={mx(classNames, 'whitespace-pre text-error')}>{String(error)}</span>;
  } else if (data) {
    return (
      <SyntaxHighlighter language='json' className={mx('px-8 py-2 text-xs rounded', classNames)}>
        {JSON.stringify(data, null, 2)}
      </SyntaxHighlighter>
    );
  }

  return <span className={mx(classNames)}>{text || '\u00D8'}</span>;
};

// TODO(burdon): Replace with thread?
// TODO(burdon): Button to delete individual messages.
// TODO(burdon): Button to re-run question.
const MessageThread = ({ state, result, history }: { state: State | null; result: string; history: Message[] }) => {
  return (
    <>
      {history.map((message, i) => (
        <div key={i} className='grid grid-cols-[3rem_1fr]'>
          <div>{message.type === 'response' && <RobotAvatar />}</div>
          <div className={mx('flex', message.type === 'request' && 'justify-end')}>
            <MessageItem
              classNames={['p-1 px-2 rounded-lg bg-hoverSurface', message.type === 'response' && 'mr-[8rem]']}
              message={message}
            />
          </div>
        </div>
      ))}
      <div className='grid grid-cols-[3rem_1fr]'>
        <div>
          {(state === 'pending' && <Icon icon='ph--spinner--regular' size={6} classNames='animate-spin-slow' />) ||
            (result.length > 0 && <RobotAvatar />)}
        </div>
        <div>
          <span>{result}</span>
        </div>
      </div>
    </>
  );
};
