//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { NavTreeNamespace } from '../namespace.ts';

export type NavTreePluginOptions = {
  /** Renders the L0 rail of workspaces beside the tree; off for a shell that shows a single workspace. */
  rail?: boolean;
};

export type NavTreeItemState = { open: boolean; current: boolean };

export type NavTreeStateStore = {
  getItem: (path: string[]) => NavTreeItemState;
  getItemAtom: (path: string[]) => Atom.Atom<NavTreeItemState>;
  setItem: (path: string[], key: 'open' | 'current', next: boolean) => void;
};

export const State = Capability.makeSingleton<NavTreeStateStore>()(`${NavTreeNamespace.key}.capability.state`);
