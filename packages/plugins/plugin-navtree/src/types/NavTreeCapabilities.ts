//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

export type NavTreeItemState = { open: boolean; current: boolean };

export type NavTreeStateStore = {
  getItem: (path: string[]) => NavTreeItemState;
  getItemAtom: (path: string[]) => Atom.Atom<NavTreeItemState>;
  setItem: (path: string[], key: 'open' | 'current', next: boolean) => void;
  /**
   * Makes an already-open plank the current item, for a deck that shows more than the item it was
   * navigated to (a collection's documents). False when the item is not open, so the caller opens it.
   */
  pick: (id: string) => boolean;
};

export const State = Capability.makeSingleton<NavTreeStateStore>()(`${meta.profile.key}.capability.state`);
