//
// Copyright 2024 DXOS.org
//

import { Play, X } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { log } from '@dxos/log';
import { DensityProvider, Input, Toolbar, useControlledValue, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';

export type DetailsPanelProps = {
  functionUrl?: string;
  binding?: string;
  onBindingChange?: (binding: string) => void;
};

export const DetailsPanel = ({ functionUrl, binding: _binding, onBindingChange }: DetailsPanelProps) => {
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
  const [history, setHistory] = useState<string[]>([]);

  console.log(':::', history);

  const handleClear = () => {
    setInput('');
    setResult('');
    setHistory([]);
    inputRef.current?.focus();
  };

  const handleDone = () => {
    console.log('!!!!!!!!!!!!!!!!!!');
    // setResult((result) => {
    //   log.info('Done', { result });
    // setHistory((history) => [...history, result]);
    // return '';
    // });
  };

  const handleRun = async () => {
    setResult('');
    setPending(true);

    fetch(functionUrl!, {
      method: 'POST',
      body: input,
    })
      // Retrieve its body as ReadableStream
      .then((response) => {
        setPending(false);

        const reader = response.body!.getReader();
        const pump = async ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
          setResult((result) => result + new TextDecoder().decode(value));
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
      <div className='flex flex-col h-full overflow-hidden'>
        <Toolbar.Root classNames='p-2'>
          <Input.Root>
            <Input.TextInput
              ref={inputRef}
              placeholder={t('function request placeholder')}
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => ev.key === 'Enter' && handleRun()}
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
          <Toolbar.Button onClick={handleRun}>
            <Play className={getSize(4)} />
          </Toolbar.Button>
          <Toolbar.Button onClick={handleClear}>
            <X className={getSize(4)} />
          </Toolbar.Button>
        </Toolbar.Root>

        <div className='flex flex-col h-full p-2 overflow-x-hidden overflow-y-auto whitespace-pre-wrap'>
          {history.map((item, i) => (
            <div key={i}>{item}</div>
          ))}
          <div>{result}</div>
          {/* <div>{JSON.stringify(pending)}</div> */}
        </div>
      </div>
    </DensityProvider>
  );
};
