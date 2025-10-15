//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Filter } from '@dxos/echo';
import { FunctionTrigger, TriggerDispatcher } from '@dxos/functions';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-ui';

import { useComputeRuntimeCallback } from './useComputeRuntimeCallback';

interface TriggerRuntimeControls {
  triggers: FunctionTrigger[];
  isRunning: boolean;
  start: () => void;
  stop: () => void;
}

export const useTriggerRuntimeControls = (space: Space | undefined): TriggerRuntimeControls => {
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
