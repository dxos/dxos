//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO(burdon): DragContext.
// TODO(burdon): Register containers and drop handlers.
// TODO(burdon): Demo different "zones".
// TODO(burdon): Morph preview when over different zones?
// TODO(burdon): Drop into document.

export type CellData<T extends Record<string | symbol, unknown> = Record<string | symbol, unknown>> = T & {
  type: 'cell' | 'container';
  id: string;
};

export type ComponentData = CellData<{ containerId: string }>;

export type ContainerData = CellData<{ objects: Obj.Any[] }>;

export type DragLocation = {
  index: number;
  data: CellData;
};

export type DragEvent = {
  source: DragLocation;
  target: DragLocation;
};

export interface DragEventHandler {
  onDrop?: (event: DragEvent) => void;
}
