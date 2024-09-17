//
// Copyright 2024 DXOS.org
//

import { Robot, Play, Spinner, X } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { log } from '@dxos/log';
import {
  DensityProvider,
  Input,
  type ThemedClassName,
  Toolbar,
  useControlledValue,
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
  const [pending, setPending] = useState(false);
  // TODO(burdon): Persistent?
  const [history, setHistory] = useState<{ type: 'request' | 'response'; text: string }[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    scrollerRef.current!.scrollTop = scrollerRef.current!.scrollHeight;
  };

  const handleClear = () => {
    setInput('');
    setResult('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleDone = () => {
    let result: string;
    // TODO(burdon): Hack.
    setResult((_result) => {
      result = _result;
      return '';
    });
    setHistory((history) => [...history, { type: 'response', text: result }]);
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
    setPending(true);

    void fetch(functionUrl!, {
      method: 'POST',
      body: input,
    })
      // Retrieve its body as ReadableStream
      .then((response) => {
        setPending(false);

        const reader = response.body!.getReader();
        const pump = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
          setResult((result) => result + new TextDecoder().decode(value));
          handleScroll();
          if (done) {
            handleDone();
            return;
          }

          return reader.read().then(pump);
        };

        // Returns a promise that resolves when a value has been received.
        return reader.read().then(pump);
      })
      .catch(log.catch);
  };

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex flex-col h-full overflow-hidden', classNames)}>
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
              {(pending && <Spinner className={mx(getSize(4), 'animate-spin-slow')} />) ||
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
          <Toolbar.Button onClick={handleClear}>
            <X className={getSize(4)} />
          </Toolbar.Button>
        </Toolbar.Root>
      </div>
    </DensityProvider>
  );
};
