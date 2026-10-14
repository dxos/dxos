//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import React, {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import { raise } from '@dxos/debug';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';

import { type LocationKind, type SpawnedProcess } from '../components/index.ts';
import { makeComputeLayer } from '../testing/index.ts';

export type ProcessContextValue<Params, Input, Output> = {
  /** Whether processes can be spawned on EDGE as well as locally. */
  edge: boolean;
  /** False until the runtime and space exist. */
  ready: boolean;
  items: SpawnedProcess<Params, Input, Output>[];
  error?: string;
  create: (location: LocationKind, params: Params) => void;
  /** Drops an ended process's card; the manager itself prunes finished processes. */
  remove: (item: SpawnedProcess<Params, Input, Output>) => void;
};

export type ProcessProviderProps = PropsWithChildren<{ edge?: boolean }>;

/**
 * A provider and hook sharing one process runtime, and the processes it spawned from `definition`,
 * between a story's modules, which render as independent surfaces.
 */
export const makeProcessContext = <Params, Input, Output>({
  name,
  definition,
}: {
  /** Name every spawned process is given. */
  name: string;
  definition: Operation.Durable<Input, Output, never, never>;
}) => {
  const Context = createContext<ProcessContextValue<Params, Input, Output> | undefined>(undefined);

  const useProcesses = (): ProcessContextValue<Params, Input, Output> =>
    useContext(Context) ?? raise(new Error(`Missing ${name} provider`));

  const Provider = ({ edge = false, children }: ProcessProviderProps) => {
    const client = useClient();
    const [space] = useSpaces();
    const registry = useContext(RegistryContext);
    const [items, setItems] = useState<SpawnedProcess<Params, Input, Output>[]>([]);
    const [error, setError] = useState<string>();

    // Created in the effect so a StrictMode remount builds a fresh runtime rather than reusing a disposed one.
    const [runtime, setRuntime] = useState<ManagedRuntime.ManagedRuntime<Process.ManagerService, never>>();
    useEffect(() => {
      const next = ManagedRuntime.make(makeComputeLayer({ registry, edge, client }));
      setRuntime(next);
      return () => {
        setItems([]);
        void next.dispose();
      };
    }, [registry, edge, client]);

    const create = useCallback(
      (kind: LocationKind, params: Params) => {
        if (!runtime || !space) {
          return;
        }
        const location: Process.Location = kind === 'edge' ? { kind, space: space.id } : { kind };
        setError(undefined);
        void runtime
          .runPromiseExit(
            Effect.gen(function* () {
              const manager = yield* Process.ManagerService;
              return yield* manager.spawn(definition, { name, location, environment: { space: space.id } });
            }),
          )
          .then((exit) =>
            Exit.match(exit, {
              onSuccess: (handle) => setItems((prev) => [{ id: handle.pid, location, params, handle }, ...prev]),
              onFailure: (cause) => setError(Cause.pretty(cause)),
            }),
          );
      },
      [runtime, space],
    );

    const remove = useCallback(
      (item: SpawnedProcess<Params, Input, Output>) => setItems((prev) => prev.filter(({ id }) => id !== item.id)),
      [],
    );

    const value = useMemo<ProcessContextValue<Params, Input, Output>>(
      () => ({ edge, ready: !!runtime && !!space, items, error, create, remove }),
      [edge, runtime, space, items, error, create, remove],
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  return { Provider, useProcesses };
};
