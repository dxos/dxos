//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Path } from '@dxos/react-ui-list';

import { meta } from '../../meta';
import { type NavTreeCapabilities as NC, NavTreeCapabilities } from '../../types';

const KEY = `${meta.id}/state/v1`;

const getInitialState = (): NC.NavTreeState => {
  const stringified = localStorage.getItem(KEY);
  if (!stringified) {
    return new Map([
      // TODO(thure): Initialize these dynamically.
      ['root', { open: true, current: false }],
      ['root~dxos.org/plugin/space-spaces', { open: true, current: false }],
      ['root~dxos.org/plugin/files', { open: true, current: false }],
    ]);
  }

  try {
    const cached: [string, { open: boolean; current: boolean }][] = JSON.parse(stringified);
    return new Map(cached.map(([key, value]) => [key, { open: value.open, current: false }]));
  } catch {
    return new Map([
      ['root', { open: true, current: false }],
      ['root~dxos.org/plugin/space-spaces', { open: true, current: false }],
      ['root~dxos.org/plugin/files', { open: true, current: false }],
    ]);
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);

    const stateAtom = Atom.make<NC.NavTreeState>(getInitialState());

    const getItem = (_path: string[]): NC.NavTreeItemState => {
      const path = Path.create(..._path);
      const state = registry.get(stateAtom);
      let value = state.get(path);
      if (!value) {
        value = { open: false, current: false, alternateTree: false };
        // Create a new Map with the new entry.
        const newState = new Map(state);
        newState.set(path, value);
        registry.set(stateAtom, newState);
      }
      return value;
    };

    const setItem = (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => {
      const pathString = Path.create(...path);
      const state = registry.get(stateAtom);
      const currentValue = state.get(pathString) ?? { open: false, current: false, alternateTree: false };
      const newValue = { ...currentValue, [key]: next };

      const newState = new Map(state);
      newState.set(pathString, newValue);
      registry.set(stateAtom, newState);

      // Persist to localStorage.
      localStorage.setItem(KEY, JSON.stringify(Array.from(newState.entries())));
    };

    const isOpen = (path: string[]) => getItem(path).open;
    const isCurrent = (path: string[]) => getItem(path).current;
    const isAlternateTree = (path: string[]) => {
      const item = getItem(path);
      return item.alternateTree ?? false;
    };

    return Capability.contributes(NavTreeCapabilities.State, {
      stateAtom,
      getItem,
      setItem,
      isOpen,
      isCurrent,
      isAlternateTree,
    });
  }),
);
