//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';

import { type DeployState } from './deploy';

export type ScriptToolbarState = Partial<DeployState>;

export type ScriptToolbarStateStore = {
  atom: Atom.Writable<ScriptToolbarState>;
  get value(): ScriptToolbarState;
  update: (updater: (current: ScriptToolbarState) => ScriptToolbarState) => void;
  set: <K extends keyof ScriptToolbarState>(key: K, value: ScriptToolbarState[K]) => void;
};

export const useToolbarState = (initialState: ScriptToolbarState = {}): ScriptToolbarStateStore => {
  const registry = useCapability(Common.Capability.AtomRegistry);
  const atom = useMemo(() => Atom.make<ScriptToolbarState>(initialState), []);

  return useMemo(
    () => ({
      atom,
      get value() {
        return registry.get(atom);
      },
      update: (updater: (current: ScriptToolbarState) => ScriptToolbarState) => {
        registry.set(atom, updater(registry.get(atom)));
      },
      set: <K extends keyof ScriptToolbarState>(key: K, v: ScriptToolbarState[K]) => {
        registry.set(atom, { ...registry.get(atom), [key]: v });
      },
    }),
    [atom, registry],
  );
};
