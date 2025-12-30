//
// Copyright 2025 DXOS.org
//

import { effect, untracked } from '@preact/signals-core';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { type Live, live } from '@dxos/live-object';
import { Path } from '@dxos/react-ui-list';

import { meta } from '../../meta';
import { NavTreeCapabilities } from '../../types';

const KEY = `${meta.id}/state/v1`;

const getInitialState = () => {
  const stringified = localStorage.getItem(KEY);
  if (!stringified) {
    return;
  }

  try {
    const cached: [string, { open: boolean; current: boolean }][] = JSON.parse(stringified);
    return cached.map(([key, value]): [string, Live<{ open: boolean; current: boolean }>] => [
      key,
      live({ open: value.open, current: false }),
    ]);
  } catch {}
};

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    const layout = context.getCapability(Common.Capability.Layout);

    // TODO(wittjosiah): This currently needs to be not a Live at the root.
    //   If it is a Live then React errors when initializing new paths because of state change during render.
    //   Ideally this could be a Live but be able to access and update the root level without breaking render.
    //   Wrapping accesses and updates in `untracked` didn't seem to work in all cases.
    const state = new Map<string, Live<{ open: boolean; current: boolean; alternateTree?: boolean }>>(
      getInitialState() ?? [
        // TODO(thure): Initialize these dynamically.
        ['root', live({ open: true, current: false })],
        ['root~dxos.org/plugin/space-spaces', live({ open: true, current: false })],
        ['root~dxos.org/plugin/files', live({ open: true, current: false })],
      ],
    );

    const getItem = (_path: string[]) => {
      const path = Path.create(..._path);
      const value = state.get(path) ?? live({ open: false, current: false, alternateTree: false });
      if (!state.has(path)) {
        state.set(path, value);
      }

      return value;
    };

    const setItem = (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => {
      const value = getItem(path);
      value[key] = next;

      localStorage.setItem(KEY, JSON.stringify(Array.from(state.entries())));
    };

    const isOpen = (path: string[]) => getItem(path).open;
    const isCurrent = (path: string[]) => getItem(path).current;
    const isAlternateTree = (path: string[]) => {
      const item = getItem(path);
      return item.alternateTree ?? false;
    };

    let previous: string[] = [];
    const unsubscribe = effect(() => {
      const removed = previous.filter((id) => !layout.active.includes(id));
      previous = layout.active;

      const handleUpdate = () => {
        removed.forEach((id) => {
          const keys = Array.from(state.keys()).filter((key) => Path.last(key) === id);
          keys.forEach((key) => {
            setItem(Path.parts(key), 'current', false);
          });
        });

        layout.active.forEach((id: string) => {
          const keys = Array.from(new Set([...state.keys(), id])).filter((key) => Path.last(key) === id);
          keys.forEach((key) => {
            setItem(Path.parts(key), 'current', true);
          });
        });
      };

      // TODO(wittjosiah): This is setTimeout because there's a race between the keys be initialized.
      //   Keys are initialized on the first render of an item in the navtree.
      //   This could be avoided if the location was a path as well and not just an id.
      const timeout = setTimeout(handleUpdate, 500);
      untracked(() => handleUpdate());
      return () => clearTimeout(timeout);
    });

    return Capability.contributes(
      NavTreeCapabilities.State,
      { state, getItem, setItem, isOpen, isCurrent, isAlternateTree },
      () => Effect.sync(() => unsubscribe()),
    );
  }),
);
