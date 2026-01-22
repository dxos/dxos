//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';
import { type NavTreeItemGraphNode } from '../types';

export namespace NavTreeCapabilities {
  export type NavTreeItemState = { open: boolean; current: boolean; alternateTree?: boolean };
  export type NavTreeState = Map<string, NavTreeItemState>;

  export type NavTreeStateStore = {
    stateAtom: Atom.Writable<NavTreeState>;
    getItem: (path: string[]) => NavTreeItemState;
    setItem: (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => void;
    isOpen: (path: string[], item?: NavTreeItemGraphNode) => boolean;
    isCurrent: (path: string[], item?: NavTreeItemGraphNode) => boolean;
    isAlternateTree: (path: string[], item?: NavTreeItemGraphNode) => boolean;
  };

  export const State = Capability.make<NavTreeStateStore>(`${meta.id}/capability/state`);
}
