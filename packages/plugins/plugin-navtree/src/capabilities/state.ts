//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { type ReactiveObject, create } from '@dxos/live-object';
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
  // TODO(wittjosiah): This currently needs to be not a ReactiveObject at the root.
  //   If it is a ReactiveObject then React errors when initializing new paths because of state change during render.
  //   Ideally this could be a ReactiveObject but be able to access and update the root level without breaking render.
  //   Wrapping accesses and updates in `untracked` didn't seem to work in all cases.
  const state = new Map<string, ReactiveObject<{ open: boolean; current: boolean }>>(
    getInitialState() ?? [
      // TODO(thure): Initialize these dynamically.
      ['root', create({ open: true, current: false })],
      ['root~dxos.org/plugin/space-spaces', create({ open: true, current: false })],
      ['root~dxos.org/plugin/files', create({ open: true, current: false })],
    ],
  );

  const getItem = (_path: string[]) => {
    const path = Path.create(..._path);
    const value = state.get(path) ?? create({ open: false, current: false });
    if (!state.has(path)) {
      state.set(path, value);
    }

    return value;
  };

  const setItem = (path: string[], key: 'open' | 'current', next: boolean) => {
    const value = getItem(path);
    value[key] = next;

    localStorage.setItem(KEY, JSON.stringify(Array.from(state.entries())));
  };

  const isOpen = (path: string[]) => getItem(path).open;
  const isCurrent = (path: string[]) => getItem(path).current;

  const location = context.requestCapability(Capabilities.Location);
  const layout = context.requestCapability(Capabilities.Layout);

  let previous: string[] = [];
  const unsubscribe = effect(() => {
    const part = layout.layoutMode === 'solo' ? 'solo' : 'main';
    const current = location.active[part]?.map(({ id }) => id) ?? [];
    const removed = previous.filter((id) => !current.includes(id));
    previous = current;

    // TODO(wittjosiah): This is setTimeout because there's a race between the keys be initialized.
    //   This could be avoided if the location was a path as well and not just an id.
    setTimeout(() => {
      removed.forEach((id) => {
        const keys = Array.from(state.keys()).filter((key) => Path.last(key) === id);
        keys.forEach((key) => {
          setItem(Path.parts(key), 'current', false);
        });
      });

      current.forEach((id) => {
        const keys = Array.from(new Set([...state.keys(), id])).filter((key) => Path.last(key) === id);
        keys.forEach((key) => {
          setItem(Path.parts(key), 'current', true);
        });
      });
    });
  });

  return contributes(NavTreeCapabilities.State, { state, getItem, setItem, isOpen, isCurrent }, () => unsubscribe());
};
