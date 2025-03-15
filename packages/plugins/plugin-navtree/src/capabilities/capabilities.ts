//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type ReactiveObject } from '@dxos/live-object';

import { NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItemGraphNode } from '../types';

export namespace NavTreeCapabilities {
  export const State = defineCapability<{
    state: Map<string, ReactiveObject<{ open: boolean; current: boolean }>>;
    getItem: (path: string[]) => ReactiveObject<{ open: boolean; current: boolean }>;
    setItem: (path: string[], key: 'open' | 'current', next: boolean) => void;
    isOpen: (path: string[], item: NavTreeItemGraphNode) => boolean;
    isCurrent: (path: string[], item: NavTreeItemGraphNode) => boolean;
  }>(`${NAVTREE_PLUGIN}/capability/state`);
}
