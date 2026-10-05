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

import * as Process from '@dxos/compute/Process';
import { raise } from '@dxos/debug';
import { type SpaceId } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';

import { type ProcessItem, type ProcessLocation } from '../components/index.ts';
import { type MandelbrotParams, MandelbrotProcess, makeComputeLayer } from '../testing/index.ts';

export type ComputeContextValue = {
  /** Whether processes can be spawned on EDGE as well as locally. */
  edge: boolean;
  /** False until the runtime and space exist. */
  ready: boolean;
  items: ProcessItem[];
  error?: string;
  create: (location: ProcessLocation, params: MandelbrotParams) => void;
  /** Drops an ended process's card; the manager itself prunes finished processes. */
  remove: (item: ProcessItem) => void;
};

/** EDGE hosts processes per space, so an `edge` process is addressed by the space it runs in. */
const toLocation = (location: ProcessLocation, space: SpaceId): Process.Location =>
  location === 'edge' ? { kind: 'edge', space } : { kind: 'local' };

const ComputeContext = createContext<ComputeContextValue | undefined>(undefined);

export const useCompute = (): ComputeContextValue =>
  useContext(ComputeContext) ?? raise(new Error('Missing ComputeProvider'));

export type ComputeProviderProps = PropsWithChildren<{ edge?: boolean }>;

/**
 * Shares one process runtime and the spawned processes between the story's modules, which render
 * as independent surfaces.
 */
export const ComputeProvider = ({ edge = false, children }: ComputeProviderProps) => {
  const client = useClient();
  const [space] = useSpaces();
  const registry = useContext(RegistryContext);
  const [items, setItems] = useState<ProcessItem[]>([]);
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
    (location: ProcessLocation, params: MandelbrotParams) => {
      if (!runtime || !space) {
        return;
      }
      setError(undefined);
      void runtime
        .runPromiseExit(
          Effect.gen(function* () {
            const manager = yield* Process.ManagerService;
            return yield* manager.spawn(MandelbrotProcess, {
              name: 'Mandelbrot',
              location: toLocation(location, space.id),
              environment: { space: space.id },
            });
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

  const remove = useCallback((item: ProcessItem) => setItems((prev) => prev.filter(({ id }) => id !== item.id)), []);

  const value = useMemo<ComputeContextValue>(
    () => ({ edge, ready: !!runtime && !!space, items, error, create, remove }),
    [edge, runtime, space, items, error, create, remove],
  );

  return <ComputeContext.Provider value={value}>{children}</ComputeContext.Provider>;
};
