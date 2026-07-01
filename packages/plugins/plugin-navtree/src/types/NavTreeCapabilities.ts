//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

export type NavTreeItemState = { open: boolean; current: boolean };

export type NavTreeStateStore = {
  getItem: (path: string[]) => NavTreeItemState;
  getItemAtom: (path: string[]) => Atom.Atom<NavTreeItemState>;
  setItem: (path: string[], key: 'open' | 'current', next: boolean) => void;
};

export const State = Capability.make<NavTreeStateStore>(`${meta.profile.key}.capability.state`);
