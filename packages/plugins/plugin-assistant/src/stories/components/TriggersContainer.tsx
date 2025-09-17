//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';
import React from 'react';

import { Filter } from '@dxos/echo';
import { FunctionTrigger, TriggerDispatcher } from '@dxos/functions';
import { AutomationPanel } from '@dxos/plugin-automation';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Input, Toolbar, useAsyncState } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-ui';

import { useComputeRuntimeCallback } from '../../hooks';
import { meta } from '../../meta';

import type { ComponentProps } from './types';

export const TriggersContainer = ({ space }: ComponentProps) => {
  const { t } = useTranslation(meta.id);
  const { triggers, isRunning, start, stop } = useTriggerRuntimeControls(space);
  return (
    <div className='flex flex-col p-2'>
      <Toolbar.Root>
        <Input.Root>
          <div>{isRunning ? t('trigger dispatcher running') : t('trigger dispatcher stopped')}</div>
          <Input.Switch classNames='mis-2 mie-2' checked={isRunning} onCheckedChange={isRunning ? stop : start} />
        </Input.Root>
      </Toolbar.Root>

      <AutomationPanel classNames='p-2' space={space} />
    </div>
  );
};

interface TriggerRuntimeControls {
  triggers: FunctionTrigger[];
  isRunning: boolean;
  start: () => void;
  stop: () => void;
}

export const useTriggerRuntimeControls = (space: Space): TriggerRuntimeControls => {
  const triggers = useQuery(space, Filter.type(FunctionTrigger));

  const [isRunningState, setIsRunningState] = useAsyncState(
    useComputeRuntimeCallback(space, () => TriggerDispatcher.pipe(Effect.map((t) => t.running))),
  );

  const start = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.start();
      setIsRunningState(true);
    }),
  );

  const stop = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.stop();
      setIsRunningState(false);
    }),
  );

  return {
    triggers,
    isRunning: isRunningState ?? false,
    start: () => void start(),
    stop: () => void stop(),
  };
};
