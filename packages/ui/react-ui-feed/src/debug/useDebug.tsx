//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo } from 'react';

import { DebugModel, type DebugProbe } from './debug-model';

const DebugContext = createContext<DebugModel | undefined>(undefined);

export type DebugProviderProps = PropsWithChildren<{ model?: DebugModel }>;

/**
 * Scope for probes. Anything under it may instrument itself; a `Debug` table under the same
 * provider renders whatever registered. No provider, no cost: the hooks below no-op.
 */
export const DebugProvider = ({ model: provided, children }: DebugProviderProps) => {
  const model = useMemo(() => provided ?? new DebugModel(), [provided]);
  return <DebugContext.Provider value={model}>{children}</DebugContext.Provider>;
};

export const useDebugModel = (): DebugModel | undefined => useContext(DebugContext);

/**
 * Register live readouts for as long as the component is mounted.
 *
 * The probe reads state through a closure, so the component never re-renders for the table's sake;
 * `deps` re-registers when the closure would go stale (a rebuilt model, a new element).
 */
export const useDebugProbes = (probes: () => DebugProbe[], deps: unknown[] = []): void => {
  const model = useDebugModel();
  useEffect(() => {
    if (!model) {
      return;
    }

    const unregister = probes().map((probe) => model.register(probe));
    return () => unregister.forEach((remove) => remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, ...deps]);
};
