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

/** Default item state for new entries. */
const defaultItemState: NC.NavTreeItemState = { open: false, current: false, alternateTree: false };

/** Default state entries for initial tree structure. */
// TODO(thure): Initialize these dynamically.
const defaultStateEntries: [string, NC.NavTreeItemState][] = [
  ['root', { open: true, current: false }],
  ['root~dxos.org/plugin/space-spaces', { open: true, current: false }],
  ['root~dxos.org/plugin/files', { open: true, current: false }],
];

const getInitialState = (): Map<string, NC.NavTreeItemState> => {
  const stringified = localStorage.getItem(KEY);
  if (!stringified) {
    return new Map(defaultStateEntries);
  }

  try {
    const cached: [string, { open: boolean; current: boolean }][] = JSON.parse(stringified);
    return new Map(cached.map(([key, value]) => [key, { open: value.open, current: false }]));
  } catch {
    return new Map(defaultStateEntries);
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const layoutAtom = yield* Capability.get(Common.Capability.Layout);

    // Backing state for persistence (not reactive).
    const backingState = getInitialState();

    // Per-path atom family for fine-grained reactivity.
    // keepAlive prevents atoms from being garbage collected when components unmount,
    // ensuring state is preserved across deletion/restoration cycles.
    const itemAtomFamily = Atom.family((pathString: string) =>
      Atom.make<NC.NavTreeItemState>(backingState.get(pathString) ?? { ...defaultItemState }).pipe(Atom.keepAlive),
    );

    const getItemAtom = (path: string[]): Atom.Atom<NC.NavTreeItemState> => {
      const pathString = Path.create(...path);
      return itemAtomFamily(pathString);
    };

    const getItem = (path: string[]): NC.NavTreeItemState => {
      return registry.get(getItemAtom(path));
    };

    const setItem = (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => {
      const pathString = Path.create(...path);
      const atom = itemAtomFamily(pathString);
      const currentValue = registry.get(atom);
      const newValue = { ...currentValue, [key]: next };

      // Update the atom.
      registry.set(atom, newValue);

      // Update backing state and persist to localStorage.
      backingState.set(pathString, newValue);
      localStorage.setItem(KEY, JSON.stringify(Array.from(backingState.entries())));
    };

    // Subscribe to layout changes to update current state.
    let previous: string[] = [];
    const unsubscribe = registry.subscribe(layoutAtom, (layout) => {
      const removed = previous.filter((id) => !layout.active.includes(id));
      previous = layout.active;

      const handleUpdate = () => {
        // Mark removed items as not current.
        removed.forEach((id) => {
          const keys = Array.from(backingState.keys()).filter((key) => Path.last(key) === id);
          keys.forEach((key) => {
            setItem(Path.parts(key), 'current', false);
          });
        });

        // Mark active items as current.
        layout.active.forEach((id: string) => {
          const keys = Array.from(new Set([...backingState.keys(), id])).filter((key) => Path.last(key) === id);
          keys.forEach((key) => {
            setItem(Path.parts(key), 'current', true);
          });
        });
      };

      // TODO(wittjosiah): This is setTimeout because there's a race between the keys being initialized.
      //   Keys are initialized on the first render of an item in the navtree.
      //   This could be avoided if the location was a path as well and not just an id.
      const timeout = setTimeout(handleUpdate, 500);
      handleUpdate();
      return () => clearTimeout(timeout);
    });

    return Capability.contributes(
      NavTreeCapabilities.State,
      {
        getItem,
        getItemAtom,
        setItem,
      },
      () => Effect.sync(() => unsubscribe()),
    );
  }),
);
