//
// Copyright 2026 DXOS.org
//

// THROWAWAY SPIKE: validates the multi-depth scene model for the infinite canvas design
// (docs/DESIGN.md). Not exported from the package; delete when the real engine lands.

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Bounds = Point & Size;

type CellBase = { id: string; z: number };
type Placed = { center: Point; size: Size };

export type RectCell = CellBase & Placed & { kind: 'rect'; label?: string };
export type TextCell = CellBase & Placed & { kind: 'text'; text: string };
/** Portal to the next depth: renders the referenced scene scaled into this cell's bounds. */
export type SceneCell = CellBase & Placed & { kind: 'scene'; scene: string };
export type LinkCell = CellBase & { kind: 'link'; source: string; target: string };

export type Cell = RectCell | TextCell | SceneCell | LinkCell;
export type PlacedCell = Exclude<Cell, LinkCell>;

/** One level of detail. Cells live in the scene's own coordinate space. */
export type Scene = {
  id: string;
  name: string;
  /** Finite logical extent; the portal mapping into a parent cell is derived from it. */
  bounds: Bounds;
  cells: Record<string, Cell>;
};

/** Stand-in for ECHO: scenes by id. */
export type SceneStore = Record<string, Scene>;

/** screen = (scene + {x, y}) * zoom */
export type Camera = { x: number; y: number; zoom: number };

export const isPlaced = (cell: Cell): cell is PlacedCell => cell.kind !== 'link';
