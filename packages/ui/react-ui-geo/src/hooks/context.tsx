//
// Copyright 2024 DXOS.org
//

import { type Dispatch, type SetStateAction, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type LatLngLiteral } from '../types';

// TODO(burdon): Factor out common geometry types.
export type Size = { width: number; height: number };

export type Point = { x: number; y: number };

export type Vector = [number, number, number];

export type GlobeContextType = {
  size: Size;
  center?: LatLngLiteral;
  zoom: number;
  translation: Point;
  rotation: Vector;
  setCenter: Dispatch<SetStateAction<LatLngLiteral>>;
  setZoom: Dispatch<SetStateAction<number>>;
  setTranslation: Dispatch<SetStateAction<Point>>;
  setRotation: Dispatch<SetStateAction<Vector>>;
};

/** @internal */
// TODO(burdon): Replace with radix.
export const GlobeContext = createContext<GlobeContextType>(undefined);

export const useGlobeContext = () => {
  return useContext(GlobeContext) ?? raise(new Error('Missing GlobeContext'));
};
