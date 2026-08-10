//
// Copyright 2024 DXOS.org
//

import { type GeoProjection } from 'd3';
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
  setSize: Dispatch<SetStateAction<Size>>;
  setCenter: Dispatch<SetStateAction<LatLngLiteral>>;
  setZoom: Dispatch<SetStateAction<number>>;
  setTranslation: Dispatch<SetStateAction<Point>>;
  setRotation: Dispatch<SetStateAction<Vector>>;
  /** Registers (or clears) the controller built by Globe.Canvas so Globe.Root can expose it via its ref. */
  registerController: (controller: GlobeController | null) => void;
};

//
// Controller
//

/**
 * Imperative options accepted by GlobeController.flyTo.
 */
export type FlyToOptions = {
  /** Base duration in ms (scales with great-circle distance). */
  duration?: number;
  /** Optional pitch offset applied along the latitude axis of the target. */
  tilt?: number;
  /**
   * Optional per-frame callback fired before the rotation tween advances.
   * Useful for layered animations (e.g. cursor / arc trails in tours).
   * `t` runs 0→1 across the eased duration.
   */
  onTick?: (t: number) => void;
};

export type FlyToTarget = LatLngLiteral & {
  /** Optional zoom factor; interpolated alongside rotation when set. */
  zoom?: number;
};

export type GlobeController = {
  canvas: HTMLCanvasElement;
  projection: GeoProjection;
  /**
   * Animates the globe to the given lat/lng (and optional zoom) along a
   * great-circle arc. Returns a Promise that resolves on completion and
   * rejects if interrupted (e.g. by another flyTo on the same globe).
   */
  flyTo: (target: FlyToTarget, options?: FlyToOptions) => Promise<void>;
  /**
   * Interrupts any in-flight `flyTo` (used by tours when stopped mid-segment).
   */
  cancelFlyTo: () => void;
} & Pick<GlobeContextType, 'zoom' | 'translation' | 'rotation' | 'setZoom' | 'setTranslation' | 'setRotation'>;

/** @internal */
// TODO(burdon): Replace with radix.
export const GlobeContext = createContext<GlobeContextType>(undefined);

export const useGlobeContext = () => {
  return useContext(GlobeContext) ?? raise(new Error('Missing GlobeContext'));
};
