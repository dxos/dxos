//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type ReactiveObject, create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { Path } from '@dxos/react-ui-mosaic';

import { NavTreeCapabilities } from './capabilities';
import { NAVTREE_PLUGIN } from '../meta';

const KEY = `${NAVTREE_PLUGIN}/state`;

const getInitialState = () => {
  const stringified = localStorage.getItem(KEY);
  if (!stringified) {
    return;
  }

  try {
    const cached: [string, { open: boolean; current: boolean }][] = JSON.parse(stringified);
    return cached.map(
      ([key, value]): [
        string,
        ReactiveObject<{
          open: boolean;
          current: boolean;
        }>,
      ] => [key, create({ open: value.open, current: false })],
    );
  } catch {}
};

export default (context: PluginsContext) => {
  const layout = context.requestCapability(Capabilities.Layout);

  const l0State = new LocalStorageStore<{ current: string }>(NAVTREE_PLUGIN, { current: 'never' });

  l0State.prop({ key: 'current', type: LocalStorageStore.string() });

  // TODO(wittjosiah): This currently needs to be not a ReactiveObject at the root.
  //   If it is a ReactiveObject then React errors when initializing new paths because of state change during render.
  //   Ideally this could be a ReactiveObject but be able to access and update the root level without breaking render.
  //   Wrapping accesses and updates in `untracked` didn't seem to work in all cases.
  const l1State = new Map<string, ReactiveObject<{ open: boolean; current: boolean }>>(
    getInitialState() ?? [
      // TODO(thure): Initialize these dynamically.
      ['root', create({ open: true, current: false })],
      ['root~dxos.org/plugin/space-spaces', create({ open: true, current: false })],
      ['root~dxos.org/plugin/files', create({ open: true, current: false })],
    ],
  );

  const getItem = (_path: string[]) => {
    const path = Path.create(..._path);
    const value = l1State.get(path) ?? create({ open: false, current: false });
    if (!l1State.has(path)) {
      l1State.set(path, value);
    }

    return value;
  };

  const setItem = (path: string[], key: 'open' | 'current', next: boolean) => {
    const value = getItem(path);
    value[key] = next;

    localStorage.setItem(KEY, JSON.stringify(Array.from(l1State.entries())));
  };

  const isOpen = (path: string[]) => getItem(path).open;
  const isCurrent = (path: string[]) => getItem(path).current;

  let previous: string[] = [];
  const unsubscribe = effect(() => {
    const removed = previous.filter((id) => !layout.active.includes(id));
    previous = layout.active;

    // TODO(wittjosiah): This is setTimeout because there's a race between the keys be initialized.
    //   This could be avoided if the location was a path as well and not just an id.
    setTimeout(() => {
      removed.forEach((id) => {
        const keys = Array.from(l1State.keys()).filter((key) => Path.last(key) === id);
        keys.forEach((key) => {
          setItem(Path.parts(key), 'current', false);
        });
      });

      layout.active.forEach((id) => {
        const keys = Array.from(new Set([...l1State.keys(), id])).filter((key) => Path.last(key) === id);
        keys.forEach((key) => {
          setItem(Path.parts(key), 'current', true);
        });
      });
    });
  });

  return contributes(
    NavTreeCapabilities.State,
    { l0State: l0State.values, l1State, getItem, setItem, isOpen, isCurrent },
    () => {
      unsubscribe();
      l0State.close();
    },
  );
};
