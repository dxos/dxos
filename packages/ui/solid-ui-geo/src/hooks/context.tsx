//
// Copyright 2024 DXOS.org
//

import { type Accessor, type JSX, type Setter, createContext, createEffect, createSignal, useContext } from 'solid-js';

import { raise } from '@dxos/debug';

import { type LatLngLiteral } from '../types';

// TODO(burdon): Factor out common geometry types.
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Vector = [number, number, number];

export type GlobeContextType = {
  size: Accessor<Size>;
  center: Accessor<LatLngLiteral | undefined>;
  zoom: Accessor<number>;
  translation: Accessor<Point | undefined>;
  rotation: Accessor<Vector | undefined>;
  setCenter: Setter<LatLngLiteral | undefined>;
  setZoom: Setter<number>;
  setTranslation: Setter<Point | undefined>;
  setRotation: Setter<Vector | undefined>;
};

const defaults = {
  center: { lat: 51, lng: 0 } as LatLngLiteral,
  zoom: 4,
} as const;

const GlobeContext = createContext<GlobeContextType>();

export type GlobeContextProviderProps = {
  children: JSX.Element;
  size?: Size;
  center?: LatLngLiteral;
  zoom?: number;
  translation?: Point;
  rotation?: Vector;
};

export const GlobeContextProvider = (props: GlobeContextProviderProps) => {
  const [size, setSize] = createSignal<Size>(props.size ?? { width: 0, height: 0 });
  const [center, setCenter] = createSignal<LatLngLiteral | undefined>(props.center ?? defaults.center);
  const [zoom, setZoom] = createSignal(props.zoom ?? defaults.zoom);
  const [translation, setTranslation] = createSignal<Point | undefined>(props.translation);
  const [rotation, setRotation] = createSignal<Vector | undefined>(props.rotation);

  // Update size when prop changes
  createEffect(() => {
    if (props.size) {
      setSize(props.size);
    }
  });

  return (
    <GlobeContext.Provider
      value={{
        size,
        center,
        zoom,
        translation,
        rotation,
        setCenter,
        setZoom,
        setTranslation,
        setRotation,
      }}
    >
      {props.children}
    </GlobeContext.Provider>
  );
};

export const useGlobeContext = () => {
  return useContext(GlobeContext) ?? raise(new Error('Missing GlobeContext'));
};
