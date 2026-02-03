//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { useContext, useEffect, useState } from 'react';

import { type Database, Filter } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { TriggerDispatcher, type TriggerDispatcherState } from '@dxos/functions-runtime';
import { useQuery } from '@dxos/react-client/echo';

import { useComputeRuntimeCallback } from './useComputeRuntimeCallback';
import { getDebugName } from '@dxos/util';

interface TriggerRuntimeControls {
  triggers: Trigger.Trigger[];

  state: TriggerDispatcherState | undefined;

  start: () => void;
  stop: () => void;
}

export const useTriggerRuntimeControls = (db: Database.Database | undefined): TriggerRuntimeControls => {
  const triggers = useQuery(db, Filter.type(Trigger.Trigger));

  const [dispatcher, setDispatcher] = useState<Context.Tag.Service<TriggerDispatcher> | undefined>(undefined);

  const init = useComputeRuntimeCallback(
    db?.spaceId,
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      setDispatcher(dispatcher);
    }),
  );

  useEffect(() => {
    void init();
  }, []);

  const state = useAtomValue(dispatcher?.state ?? Atom.make(undefined));

  const start = useComputeRuntimeCallback(
    db?.spaceId,
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.start();
    }),
  );

  const stop = useComputeRuntimeCallback(
    db?.spaceId,
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.stop();
    }),
  );

  return {
    triggers,
    state,
    start: () => void start(),
    stop: () => void stop(),
  };
};
