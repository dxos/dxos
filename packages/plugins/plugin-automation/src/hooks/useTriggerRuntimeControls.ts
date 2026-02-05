//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Filter } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { TriggerDispatcher } from '@dxos/functions-runtime';
import { useQuery } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-ui';

import { useComputeRuntimeCallback } from './useComputeRuntimeCallback';

interface TriggerRuntimeControls {
  triggers: Trigger.Trigger[];
  isRunning: boolean;
  start: () => void;
  stop: () => void;
}

export const useTriggerRuntimeControls = (db: Database.Database | undefined): TriggerRuntimeControls => {
  const triggers = useQuery(db, Filter.type(Trigger.Trigger));

  const [isRunningState, setIsRunningState] = useAsyncState(
    useComputeRuntimeCallback(db?.spaceId, () => TriggerDispatcher.pipe(Effect.map((t) => t.running))),
  );

  const start = useComputeRuntimeCallback(
    db?.spaceId,
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.start();
      setIsRunningState(true);
    }),
  );

  const stop = useComputeRuntimeCallback(
    db?.spaceId,
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
