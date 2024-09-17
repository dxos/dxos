//
// Copyright 2024 DXOS.org
//

import { Robot, Play, Spinner } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import {
  DensityProvider,
  Icon,
  Input,
  type ThemedClassName,
  Toolbar,
  useControlledValue,
  useDynamicRef,
  useTranslation,
} from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';

export type DetailsPanelProps = ThemedClassName<{
  functionUrl?: string;
  binding?: string;
  onBindingChange?: (binding: string) => void;
}>;

export const DetailsPanel = ({ classNames, functionUrl, binding: _binding, onBindingChange }: DetailsPanelProps) => {
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
  const [state, setState] = useState<'pending' | 'responding' | null>(null);

  // TODO(burdon): Persistent history (non-space ECHO data?)
  const [history, setHistory] = useState<{ type: 'request' | 'response'; text: string }[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // TODO(burdon): Factor out.
  const controller = useRef(new AbortController());
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      handleStop();
      mountedRef.current = false;
    };
  }, []);

  const handleScroll = () => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  };

  const handleStop = () => {
    controller.current.abort();
  };

  const handleClear = () => {
    handleClear();
    setInput('');
    setResult('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleDone = () => {
    setHistory((history) => [...history, { type: 'response', text: resultRef.current }]);
    setResult('');
    handleScroll();
  };

  const handleRun = async (input: string) => {
    if (input.trim().length === 0) {
      inputRef.current?.focus();
      return;
    }

    setHistory((history) => [...history, { type: 'request', text: input }]);
    setInput('');
    setResult('');

    // Returns a promise that resolves when a value has been received.
    try {
      setState('pending');

      // Get stream
      const response = await fetch(functionUrl!, {
        signal: controller.current.signal,
        method: 'POST',
        body: input,
      });

      // TODO(burdon): Error handling.
      if (!response.ok) {
        setState(null);
        return;
      }

      setState('responding');
      const reader = response.body!.getReader();
      const pump = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
        setResult((result) => result + new TextDecoder().decode(value));
        handleScroll();
        if (done || !mountedRef.current) {
          handleDone();
          return;
        }

        return reader.read().then(pump);
      };

      void reader.read().then(pump);
    } catch (err) {
      log.catch(err);
    } finally {
      setState(null);
    }
  };

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col h-full overflow-hidden', classNames)}>
        {/* TODO(burdon): Replace with Thread? */}
        <div ref={scrollerRef} className='flex flex-col gap-6 h-full p-4 overflow-x-hidden overflow-y-auto'>
          {history.map(({ type, text }, i) => (
            <div key={i} className='grid grid-cols-[2rem_1fr]'>
              <div className='p-1'>{type === 'response' && <Robot className={mx(getSize(4))} />}</div>
              <div className={mx('flex', type === 'request' && 'justify-end')}>
                <span className={mx(type === 'request' && 'p-1 px-2 rounded-lg bg-hoverSurface')}>{text}</span>
              </div>
            </div>
          ))}
          <div className='grid grid-cols-[2rem_1fr]'>
            <div className='p-1'>
              {(state === 'pending' && <Spinner className={mx(getSize(4), 'animate-spin-slow')} />) ||
                (result.length > 0 && <Robot className={mx(getSize(4))} />)}
            </div>
            <div>
              <span>{result}</span>
            </div>
          </div>
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
            <Play className={getSize(4)} />
          </Toolbar.Button>
          <Toolbar.Button onClick={() => (state ? handleStop() : handleClear())}>
            <Icon icon={state ? 'ph--stop--regular' : 'ph--trash--regular'} size={4} />
          </Toolbar.Button>
        </Toolbar.Root>
      </div>
    </DensityProvider>
  );
};
