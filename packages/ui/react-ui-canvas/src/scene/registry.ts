//
// Copyright 2026 DXOS.org
//

//
// Cell definitions (decision 12): what a kind of cell renders, where its ports are and how it may be
// manipulated. Shape-specific, not per instance, so the data stays small and ports come for free.
//

import { type ComponentType } from 'react';

import { defaultPorts } from './ports.ts';
import { PortalCellView, RectCellView, TextCellView } from './SceneLayer.tsx';
import { type SceneStore } from './store.ts';
import { type PlacedCell, type Port, type Scene, type Size } from './types.ts';

export type CellViewProps = {
  cell: PlacedCell;
  scene: Scene;
  store: SceneStore;
  registry: CellRegistry;
  /** Effective screen zoom of the layer (camera zoom × portal scales), for level-of-detail choices. */
  zoom: number;
  /** Nesting depth of the layer; 0 is the root. */
  depth: number;
  selected: boolean;
};

export type CellDef = {
  kind: PlacedCell['kind'];
  component: ComponentType<CellViewProps>;
  ports: (cell: PlacedCell) => readonly Port[];
  resizable?: boolean;
  minSize?: Size;
  /** Double-click opens the cell (a portal drills in; a text cell edits, later). */
  openable?: boolean;
};

export type CellRegistry = Readonly<Record<PlacedCell['kind'], CellDef>>;

export const defaultRegistry: CellRegistry = {
  rect: {
    kind: 'rect',
    component: RectCellView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: { width: 64, height: 32 },
  },
  text: {
    kind: 'text',
    component: TextCellView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: { width: 64, height: 32 },
  },
  scene: {
    kind: 'scene',
    component: PortalCellView,
    ports: () => defaultPorts,
    resizable: true,
    minSize: { width: 96, height: 60 },
    openable: true,
  },
};
