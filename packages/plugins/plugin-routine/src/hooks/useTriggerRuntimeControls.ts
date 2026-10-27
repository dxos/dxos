//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { TriggerDispatcher, type TriggerDispatcherState } from '@dxos/compute-runtime';
import * as Trigger from '@dxos/compute/Trigger';
import { type Database, Filter, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

interface TriggerRuntimeControls {
  triggers: Trigger.Trigger[];
  state: TriggerDispatcherState | undefined;
  start: () => void;
  stop: () => void;
}

export const useTriggerRuntimeControls = (db: Database.Database | undefined): TriggerRuntimeControls => {
  const triggers = useQuery(
    db,
    Query.select(Filter.type(Trigger.Trigger)).debugLabel('plugin-routine.useTriggerRuntimeControls'),
  );

  const [dispatcher, setDispatcher] = useState<Context.Service.Shape<typeof TriggerDispatcher> | undefined>(undefined);

  const init = Hooks.useSpaceCallback(
    db?.spaceId,
    [TriggerDispatcher],
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      setDispatcher(dispatcher);
    }),
  );

  useEffect(() => {
    void init();
  }, []);

  const state = useAtomValue(dispatcher?.state ?? Atom.make(undefined));

  const start = Hooks.useSpaceCallback(
    db?.spaceId,
    [TriggerDispatcher],
    Effect.fnUntraced(function* () {
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.start();
    }),
  );

  const stop = Hooks.useSpaceCallback(
    db?.spaceId,
    [TriggerDispatcher],
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
