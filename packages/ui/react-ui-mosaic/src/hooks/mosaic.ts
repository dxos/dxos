//
// Copyright 2025 DXOS.org
//

/**
 * Pragmatic drag and drop data.
 */
export type CellData<T extends Record<string | symbol, unknown> = Record<string | symbol, unknown>> = T & {
  type: 'cell' | 'container';
  id: string;
};

export type ComponentData = CellData<{ containerId: string }>;

export type ContainerData = CellData;

//
// Events
//

export type DragLocation = {
  index: number;
  data: CellData;
};

export type DropEvent = {
  source: ComponentData;
  target: ContainerData;
};

export interface DropEventHandler {
  id: string;
  canDrop: (data: ComponentData) => boolean;
  onDrop: (event: DropEvent) => void;
}
