//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import React, { useCallback, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Summarizer } from '../contracts/index.ts';
import { CallLog } from './CallLog.tsx';
import { bindingLabel, useProperty, useServices, useSnapshot } from './ServicesContext.tsx';

/** Story module: the consumer's view of `Summarizer`; the first token names the host that answered. */
export const SummarizerModule = () => {
  const { summarizer } = useServices();
  const snapshot = useSnapshot();
  const status = useProperty(summarizer.status);
  const [text, setText] = useState('A consumer plugin calls a service and does not know where its provider runs.');
  const [tokens, setTokens] = useState<readonly string[]>([]);
  const [error, setError] = useState<string>();

  const handleSummarize = useCallback(() => {
    setTokens([]);
    setError(undefined);
    void EffectEx.runPromise(
      Stream.runForEach(summarizer.summarize({ text }), (token) =>
        Effect.sync(() => setTokens((current) => [...current, token])),
      ),
    ).catch((err) => setError(err instanceof Error ? `${err.name}: ${err.message}` : String(err)));
  }, [summarizer, text]);

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Summarizer: {status ?? '—'}</Toolbar.Text>
          <Button.Root
            icon='ph--sparkle--regular'
            label='Summarize'
            onClick={handleSummarize}
            data-testid='summarizer-run'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col gap-2 p-2'>
        <p className='text-sm text-fg-muted' data-testid='summarizer-binding'>
          Summarizer: {bindingLabel(snapshot.bindings[Summarizer.Contract.key])}
        </p>
        <Input.Textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} />
        {error && (
          <p className='text-sm text-error-text' data-testid='summarizer-error'>
            {error}
          </p>
        )}
        <p className='text-sm' data-testid='summarizer-output'>
          {tokens.join(' ')}
        </p>
        <CallLog contractKey={Summarizer.Contract.key} />
      </Panel.Body>
    </Panel.Root>
  );
};
