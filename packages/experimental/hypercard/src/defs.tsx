//
// Copyright 2023 DXOS.org
//

export type Point = { x: number; y: number };

export type Bounds = { point?: Point; x: number; y: number; width: number; height: number };

export type Item = {
  id: string;
  point: Point;
  label: string;
  content?: string;
  children?: Item[];
};
