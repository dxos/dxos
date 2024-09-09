//
// Copyright 2024 DXOS.org
//

import React, { createContext, type Dispatch, type PropsWithChildren, type SetStateAction, useContext } from 'react';

import { raise } from '@dxos/debug';
import { useControlledValue } from '@dxos/react-ui';

// TODO(burdon): Factor out common geometry types.
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Vector = [number, number, number];

export type GlobeContextType = {
  size?: Size;
  scale?: number;
  translation?: Point;
  rotation?: Vector;
  setScale?: Dispatch<SetStateAction<number>>;
  setTranslation?: Dispatch<SetStateAction<Point>>;
  setRotation?: Dispatch<SetStateAction<Vector>>;
};

const GlobeContext = createContext<GlobeContextType>({});

export const GlobeContextProvider = ({
  children,
  size,
  scale: _scale,
  translation: _translation,
  rotation: _rotation,
}: PropsWithChildren<GlobeContextType>) => {
  const [scale, setScale] = useControlledValue(_scale);
  const [translation, setTranslation] = useControlledValue<Point>(_translation);
  const [rotation, setRotation] = useControlledValue<Vector>(_rotation);

  return (
    <GlobeContext.Provider value={{ size, scale, translation, rotation, setScale, setTranslation, setRotation }}>
      {children}
    </GlobeContext.Provider>
  );
};

export const useGlobeContext = () => {
  return useContext(GlobeContext) ?? raise(new Error('Missing GlobeContext'));
};
