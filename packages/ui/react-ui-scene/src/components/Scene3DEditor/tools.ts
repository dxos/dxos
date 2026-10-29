//
// Copyright 2026 DXOS.org
//

import { type GizmoMode } from '../../three/index.ts';

/** What a left-button press does in the editor. */
export type Tool3D = 'select' | 'orbit' | GizmoMode | 'link' | 'extrude' | { create: string } | { place: string };

/** The orbit tool takes the left button, so a trackpad can orbit; other tools leave it to themselves. */
export const orbitButtons = (tool: Tool3D): 'all' | 'secondary' => (tool === 'orbit' ? 'all' : 'secondary');

/** A click picks with every tool but orbit, whose drags only move the camera. */
export const clickSelects = (tool: Tool3D): boolean => tool !== 'orbit';

/** Half a new shape's unit height: a created shape stands on the point clicked rather than sinking through the ground. */
const HALF_UNIT = 0.5;

/** Where a created shape's centre goes for a point on the ground, so its unit body rests on it. */
export const restingCenter = (point: { x: number; y: number; z: number }): { x: number; y: number; z: number } => ({
  ...point,
  y: point.y + HALF_UNIT,
});

/** The tool in use: a locked (read-only) scene keeps only select and orbit, which look without changing anything. */
export const editableTool = (tool: Tool3D, readonly: boolean): Tool3D =>
  readonly && tool !== 'select' && tool !== 'orbit' ? 'select' : tool;

/** A point on the ground moved to the nearest grid point `unit` apart (x and z); a zero unit leaves it where it is. */
export const groundSnap = (
  point: { x: number; y: number; z: number },
  unit: number,
): { x: number; y: number; z: number } =>
  unit > 0 ? { x: Math.round(point.x / unit) * unit, y: point.y, z: Math.round(point.z / unit) * unit } : point;
