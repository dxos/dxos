//
// Copyright 2026 DXOS.org
//

//
// What an effect returns, by renderer (plugin-animator DESIGN.md §6): plain data a stage or the animator draws. The
// runtime keeps only items of the renderer's type (`EffectRunnerOptions.accept`), so a stage never draws anything else.
//

import { type Vec3 } from '../types.ts';

export type Vec2 = { x: number; y: number };

/** A `2d` item, in the stage's 2D coordinates. A hue is a theme hue; `color` a CSS colour, which wins over it. */
export type Shape2D =
  | { kind: 'circle'; center: Vec2; radius: number; hue?: string; color?: string; opacity?: number }
  | {
      kind: 'rect';
      bounds: { x: number; y: number; width: number; height: number };
      radius?: number;
      hue?: string;
      color?: string;
      opacity?: number;
    }
  | {
      kind: 'path';
      d: string;
      stroke?: string;
      hue?: string;
      color?: string;
      width?: number;
      opacity?: number;
      /** How much of the path is drawn, 0 to 1 from its start: a stroke being revealed. */
      reveal?: number;
    };

/** A `3d` item: one primitive the stage draws with an instanced mesh, in the stage's 3D coordinates (F-5.4). */
export type Instance3D = {
  primitive: 'sphere' | 'cube';
  position: Vec3;
  /** The primitive's radius (a sphere) or half-width (a cube). */
  scale: number;
  color: string;
  opacity: number;
};

/**
 * Where an overlay item sits on screen: beside a target (at `angle` radians from its centre, 0 to the right,
 * `gap` pixels beyond its projected radius), or at a point of the frame given as fractions of its width and height.
 */
export type OverlayAnchor = { target: string; angle?: number; gap?: number } | { frame: Vec2 };

/** One message of an overlay thread. */
export type OverlayMessage = { text: string; who?: string; color?: string; opacity: number };

/** An `overlay` item: DOM content the animator draws above the stage, anchored through the stage's projection. */
export type OverlayItem =
  | {
      kind: 'thread';
      id: string;
      anchor: OverlayAnchor;
      messages: OverlayMessage[];
      opacity: number;
      /** Which way the thread hangs from its anchor; `start` reads right-aligned to the anchor's left. */
      align?: 'start' | 'end';
    }
  | {
      kind: 'card';
      id: string;
      anchor: OverlayAnchor;
      title: string;
      /** A small heading above the title (the object's type). */
      label?: string;
      rows?: [string, string][];
      messages?: OverlayMessage[];
      opacity: number;
      align?: 'start' | 'end';
    }
  | { kind: 'line'; id: string; from: OverlayAnchor; to: OverlayAnchor; color?: string; opacity: number }
  | { kind: 'text'; id: string; anchor: OverlayAnchor; text: string; color?: string; size?: number; opacity: number };

const kindOf = (value: unknown): unknown =>
  typeof value === 'object' && value !== null ? Reflect.get(value, 'kind') : undefined;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const isShape2D = (value: unknown): value is Shape2D => {
  const kind = kindOf(value);
  return kind === 'circle' || kind === 'rect' || kind === 'path';
};

export const isInstance3D = (value: unknown): value is Instance3D => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const primitive: unknown = Reflect.get(value, 'primitive');
  const position: unknown = Reflect.get(value, 'position');
  return (
    (primitive === 'sphere' || primitive === 'cube') &&
    typeof position === 'object' &&
    position !== null &&
    isFiniteNumber(Reflect.get(position, 'x')) &&
    isFiniteNumber(Reflect.get(position, 'y')) &&
    isFiniteNumber(Reflect.get(position, 'z')) &&
    isFiniteNumber(Reflect.get(value, 'scale'))
  );
};

export const isOverlayItem = (value: unknown): value is OverlayItem => {
  const kind = kindOf(value);
  return (
    (kind === 'thread' || kind === 'card' || kind === 'line' || kind === 'text') &&
    typeof Reflect.get(Object(value), 'id') === 'string'
  );
};
