//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

export namespace NavTreeCapabilities {
  export type NavTreeItemState = { open: boolean; current: boolean; alternateTree?: boolean };

  export type NavTreeStateStore = {
    getItem: (path: string[]) => NavTreeItemState;
    getItemAtom: (path: string[]) => Atom.Atom<NavTreeItemState>;
    setItem: (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => void;
  };

  export const State = Capability.make<NavTreeStateStore>(`${meta.id}/capability/state`);
}
