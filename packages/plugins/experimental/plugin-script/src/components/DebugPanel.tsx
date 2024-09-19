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
  useDynamicRef,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';

type State = 'pending' | 'responding';

type Item = { type: 'request' | 'response'; text: string };

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
  const resultRef = useDynamicRef(result);
  const [state, setState] = useState<State | null>(null);

  // TODO(burdon): Persistent history (non-space ECHO data?)
  const [history, setHistory] = useState<Item[]>([]);

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

  // TODO(burdon): Halt streaming request?
  const handleClear = () => {
    handleStop();
    setInput('');
    setResult('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleDone = () => {
    controller.current = undefined;
    setHistory((history) => [...history, { type: 'response', text: resultRef.current }]);
    setResult('');
    setState(null);
    handleScroll();
  };

  const handleRun = async (input: string) => {
    setHistory((history) => [...history, { type: 'request', text: input }]);
    setInput('');
    setResult('');

    // Returns a promise that resolves when a value has been received.
    try {
      setState('pending');

      // Throws DOMException when aborted.
      controller.current = new AbortController();
      const response = await fetch(functionUrl!, {
        signal: controller.current.signal,
        method: 'POST',
        body: input,
      });

      console.log(1, response.headers.get('content-type'));
      console.log(2, response.statusText);
      console.log(3, response.body);

      // TODO(burdon): Error handling.
      if (!response.ok) {
        setState(null);
        const text = await response.text();
        setResult(text + response.status);
        return;
      }

      try {
        const data = await response.json();
        console.log({ data });
        const text = await response.text();
        console.log({ text });
        console.log(response.body);
      } catch (err) {
        log.catch(err);
      }

      setState('responding');
      const reader = response.body!.getReader();
      const pump = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
        setResult((result) => result + new TextDecoder().decode(value));
        handleScroll();
        if (!controller.current || done) {
          handleDone();
          return;
        }

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
    } catch (err) {
      setState(null);
      if (err !== 'stop') {
        log.catch(err);
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
              onKeyDown={(ev) => ev.key === 'Enter' && handleRun(input)}
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
          <Toolbar.Button onClick={() => handleRun(input)}>
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

// TODO(burdon): Replace with thread?
// TODO(burdon): Delete individual messages.
// TODO(burdon): Re-run question.
const MessageThread = ({ state, result, history }: { state: State | null; result: string; history: Item[] }) => {
  return (
    <>
      {history.map(({ type, text }, i) => (
        <div key={i} className='grid grid-cols-[3rem_1fr]'>
          <div>{type === 'response' && <RobotAvatar />}</div>
          <div className={mx('flex', type === 'request' && 'justify-end')}>
            <span className={mx(type === 'request' && 'p-1 px-2 rounded-lg bg-hoverSurface')}>
              {text.length ? text : '\u00D8'}
            </span>
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
