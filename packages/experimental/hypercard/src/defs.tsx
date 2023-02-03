//
// Copyright 2023 DXOS.org
//

export type Point = { x: number; y: number };

// TODO(burdon): Util/rename.
export const toString = ({ x, y }: Point) => `${x}:${y}`;
export const fromString = (id: string) => {
  const parts = id.split(':');
  return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
};

export type Dimensions = { width: number; height: number };

export type Bounds = { x: number; y: number; width: number; height: number };

export type Item = {
  id: string;
  point: Point;
  label: string;
  content?: string;
  children?: Item[];
};
