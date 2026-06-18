//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';
import { type ComputeGraphRegistry as ComputeGraphRegistryType } from '@dxos/compute-hyperformula';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';

import { meta } from '#meta';

export type GridEntry = { grid: DxGridElement; setActiveRefs: (refs: GridContentProps['activeRefs']) => void };

export type GridRegistry = {
  register: (attendableId: string, grid: DxGridElement, setActiveRefs: GridEntry['setActiveRefs']) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => GridEntry | undefined;
};

export const ComputeGraphRegistry = Capability.make<ComputeGraphRegistryType>(
  `${meta.id}.capability.computeGraphRegistry`,
);

/** Registry of active grid instances keyed by attendable ID. */
export const GridInstances = Capability.make<GridRegistry>(`${meta.id}.capability.gridInstances`);
