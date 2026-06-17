//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';
import { type ComputeGraphRegistry as ComputeGraphRegistryType } from '@dxos/compute-hyperformula';
import { type DxGridElement, type GridContentProps } from '@dxos/react-ui-grid';

import { meta } from '#meta';

export type GridEntry = {
  grid: DxGridElement;
  setActiveRefs: (refs: GridContentProps['activeRefs']) => void;
  sheetId: string;
  /** Re-ingest the sheet's cells into the compute engine after an external doc write (e.g. accept-change). */
  reload: () => void;
  /** The current selection as a cell-range anchor (`"col,row:col,row"`), or undefined when none. */
  getAnchor: () => string | undefined;
};

export type GridRegistry = {
  register: (attendableId: string, entry: GridEntry) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => GridEntry | undefined;
  /** Find the entry for a sheet by its object id, independent of the attendable-id key used to register. */
  getBySheetId: (sheetId: string) => GridEntry | undefined;
};

export const ComputeGraphRegistry = Capability.make<ComputeGraphRegistryType>(
  `${meta.id}.capability.computeGraphRegistry`,
);

/** Registry of active grid instances keyed by attendable ID. */
export const GridInstances = Capability.make<GridRegistry>(`${meta.id}.capability.gridInstances`);
