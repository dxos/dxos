import React, { useEffect, useState } from 'react';
import { FunctionTrigger, TriggerDispatcher } from '@dxos/functions';
import type { ComponentProps } from './types';
import { Filter } from '@dxos/echo';
import { useQuery, Space } from '@dxos/react-client/echo';
import { useComputeRuntimeCallback } from '../../hooks';
import { Effect } from 'effect';
import { Input, type ThemedClassName, useDynamicRef, useTranslation, useAsyncState } from '@dxos/react-ui';

export const TriggersContainer = ({ space }: ComponentProps) => {
  const { triggers, isRunning, start, stop } = useTriggerRuntimeControls(space);
  return (
    <div>
      <div className='flex gap-2 items-center flex-row'>
        <h2>{isRunning ? 'Trigger dispatcher running' : 'Trigger dispatcher stopped'}</h2>
        <Input.Root>
          <Input.Switch classNames='mis-2 mie-2' checked={isRunning} onCheckedChange={isRunning ? stop : start} />
        </Input.Root>
      </div>

      {/* TODO(dmaretskyi): Use existing trigger list component from composer. */}
      <ul>
        {triggers.map((trigger) => (
          <li key={trigger.id}>
            {trigger.id}, {JSON.stringify(trigger.spec)}
          </li>
        ))}
      </ul>
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
