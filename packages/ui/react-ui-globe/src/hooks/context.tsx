//
// Copyright 2024 DXOS.org
//

import React, { createContext, type Dispatch, type PropsWithChildren, type SetStateAction, useContext } from 'react';

import { raise } from '@dxos/debug';
import { useControlledValue } from '@dxos/react-ui';

import { type LatLng } from '../util';

// TODO(burdon): Factor out common geometry types.
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Vector = [number, number, number];

export type GlobeContextType = {
  size: Size;
  center: LatLng;
  scale: number;
  translation: Point;
  rotation: Vector;
  setCenter: Dispatch<SetStateAction<LatLng>>;
  setScale: Dispatch<SetStateAction<number>>;
  setTranslation: Dispatch<SetStateAction<Point>>;
  setRotation: Dispatch<SetStateAction<Vector>>;
};

const GlobeContext = createContext<GlobeContextType>(undefined);

export type GlobeContextProviderProps = PropsWithChildren<
  Partial<Pick<GlobeContextType, 'size' | 'center' | 'scale' | 'translation' | 'rotation'>>
>;

export const GlobeContextProvider = ({
  children,
  size,
  center: _center,
  scale: _scale,
  translation: _translation,
  rotation: _rotation,
}: GlobeContextProviderProps) => {
  const [center, setCenter] = useControlledValue(_center);
  const [scale, setScale] = useControlledValue(_scale);
  const [translation, setTranslation] = useControlledValue<Point>(_translation);
  const [rotation, setRotation] = useControlledValue<Vector>(_rotation);

  return (
    <GlobeContext.Provider
      value={{ size, center, scale, translation, rotation, setCenter, setScale, setTranslation, setRotation }}
    >
      {children}
    </GlobeContext.Provider>
  );
};

export const useGlobeContext = () => {
  return useContext(GlobeContext) ?? raise(new Error('Missing GlobeContext'));
};
