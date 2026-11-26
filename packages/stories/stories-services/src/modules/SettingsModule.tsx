//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, { useCallback, useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Settings } from '../contracts/index.ts';
import { CallLog } from './CallLog.tsx';
import { bindingLabel, useProperty, useServices, useSnapshot } from './ServicesContext.tsx';

/** Story module: the consumer's view of `Settings`, which it reaches only through its client. */
export const SettingsModule = () => {
  const { settings, startupError, retry } = useServices();
  const snapshot = useSnapshot();
  const values = useProperty(settings.values);
  const [key, setKey] = useState('theme');
  const [value, setValue] = useState('dark');
  const [changed, setChanged] = useState<Settings.Setting>();
  const [error, setError] = useState<string>();

  // The event is the service telling its consumers of one change, whichever host it came from.
  useEffect(() => {
    const fiber = Effect.runFork(
      Stream.runForEach(settings.changed, (setting) => Effect.sync(() => setChanged(setting))).pipe(Effect.ignore),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [settings]);

  const handleSet = useCallback(() => {
    setError(undefined);
    void EffectEx.runPromise(settings.set({ key, value })).catch((err) => setError(String(err)));
  }, [settings, key, value]);

  const handleReset = useCallback(() => {
    setError(undefined);
    void EffectEx.runPromise(settings.reset({})).catch((err) => setError(String(err)));
  }, [settings]);

  const entries = Object.entries(values ?? {});
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Settings: {values ? entries.length : '—'}</Toolbar.Text>
          <Button.Root icon='ph--check--regular' label='Set' onClick={handleSet} data-testid='settings-set' />
          <Button.Root icon='ph--trash--regular' label='Reset' onClick={handleReset} data-testid='settings-reset' />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 space-y-2 overflow-y-auto'>
        <p className='text-sm text-fg-muted' data-testid='settings-binding'>
          Settings: {bindingLabel(snapshot.bindings[Settings.Contract.key])}
        </p>
        <div className='flex gap-2'>
          <Input.Root
            placeholder='Key'
            value={key}
            onChange={(event) => setKey(event.target.value)}
            data-testid='settings-key'
          />
          <Input.Root
            placeholder='Value'
            value={value}
            onChange={(event) => setValue(event.target.value)}
            data-testid='settings-value'
          />
        </div>
        {startupError && (
          <div className='flex items-center gap-2 text-sm text-error-text' data-testid='settings-startup-error'>
            <span>Settings plugin failed to start: {startupError}</span>
            <Button.Root label='Retry' onClick={retry} data-testid='settings-retry' />
          </div>
        )}
        {error && <p className='text-sm text-error-text'>{error}</p>}
        <ul className='text-sm space-y-1' data-testid='settings-list'>
          {entries.map(([name, current]) => (
            <li key={name}>
              <span className='text-fg-muted'>{name}</span> {current}
            </li>
          ))}
        </ul>
        {changed && (
          <p className='text-sm text-fg-muted' data-testid='settings-changed'>
            Last changed: {changed.key}
          </p>
        )}
        <CallLog contractKey={Settings.Contract.key} />
      </Panel.Body>
    </Panel.Root>
  );
};
