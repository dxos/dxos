//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useCapability } from '@dxos/app-framework/ui';

import { type DeployState } from './deploy.ts';

export type ScriptToolbarState = Partial<DeployState>;

export type ScriptToolbarStateStore = {
  atom: Atom.Writable<ScriptToolbarState>;
  get value(): ScriptToolbarState;
  update: (updater: (current: ScriptToolbarState) => ScriptToolbarState) => void;
  set: <K extends keyof ScriptToolbarState>(key: K, value: ScriptToolbarState[K]) => void;
};

export const useToolbarState = (initialState: ScriptToolbarState = {}): ScriptToolbarStateStore => {
  const registry = useCapability(Capabilities.AtomRegistry);
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
