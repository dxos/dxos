//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';

import { NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItemGraphNode } from '../types';

export namespace NavTreeCapabilities {
  export const State = defineCapability<{
    state: Map<string, Live<{ open: boolean; current: boolean; alternateTree?: boolean }>>;
    getItem: (path: string[]) => Live<{ open: boolean; current: boolean; alternateTree?: boolean }>;
    setItem: (path: string[], key: 'open' | 'current' | 'alternateTree', next: boolean) => void;
    isOpen: (path: string[], item: NavTreeItemGraphNode) => boolean;
    isCurrent: (path: string[], item: NavTreeItemGraphNode) => boolean;
    isAlternateTree: (path: string[], item: NavTreeItemGraphNode) => boolean;
  }>(`${NAVTREE_PLUGIN}/capability/state`);
}
