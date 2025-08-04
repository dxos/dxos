//
// Copyright 2024 DXOS.org
//

import React, { type Dispatch, type PropsWithChildren, type SetStateAction, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { useControlledState } from '@dxos/react-ui';

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

const GlobeContext = createContext<GlobeContextType>(undefined);

export type GlobeContextProviderProps = PropsWithChildren<
  Partial<Pick<GlobeContextType, 'size' | 'center' | 'zoom' | 'translation' | 'rotation'>>
>;

export const GlobeContextProvider = ({
  children,
  size,
  center: _center,
  zoom: _zoom,
  translation: _translation,
  rotation: _rotation,
}: GlobeContextProviderProps) => {
  const [center, setCenter] = useControlledState(_center);
  const [zoom, setZoom] = useControlledState(_zoom);
  const [translation, setTranslation] = useControlledState<Point>(_translation);
  const [rotation, setRotation] = useControlledState<Vector>(_rotation);

  return (
    <GlobeContext.Provider
      value={{ size, center, zoom, translation, rotation, setCenter, setZoom, setTranslation, setRotation }}
    >
      {children}
    </GlobeContext.Provider>
  );
};

export const useGlobeContext = () => {
  return useContext(GlobeContext) ?? raise(new Error('Missing GlobeContext'));
};
