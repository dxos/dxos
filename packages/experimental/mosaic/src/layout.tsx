//
// Copyright 2023 DXOS.org
//

export type Point = { x: number; y: number };

export type Dimensions = { width: number; height: number };

export type Bounds = { x: number; y: number; width: number; height: number };

export type Location = { x: number; y: number };

// TODO(burdon): Make generic part of location.
export const serializeLocation = ({ x, y }: Location) => `${x}:${y}`;
export const parseLocation = (id: string): Location => {
  const parts = id.split(':');
  return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
};

export interface Layout {
  range: { x: number; y: number };
  dimensions: Dimensions;
  cells: Location[];
  getCenter(location: Location): Point;
  getBounds(location: Location): Bounds;
}

/**
 * Tile data item.
 */
export type Item<T = {}> = {
  id: string;
  label: string;
  content?: string;
  children?: Item[];
  location: Location;
  data: T;
};
