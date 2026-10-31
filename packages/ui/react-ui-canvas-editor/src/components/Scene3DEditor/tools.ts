//
// Copyright 2026 DXOS.org
//

import { type GizmoMode } from '@dxos/react-ui-canvas/3d';
import { type Scene } from '@dxos/scene';

import { axisOf } from './gizmo.ts';

/** What a left-button press does in the editor. */
export type Tool3D = 'select' | 'orbit' | GizmoMode | 'link' | 'extrude' | { create: string } | { place: string };

/** The orbit tool takes the left button, so a trackpad can orbit; other tools leave it to themselves. */
export const orbitButtons = (tool: Tool3D): 'all' | 'secondary' => (tool === 'orbit' ? 'all' : 'secondary');

/** A click picks with every tool but orbit, whose drags only move the camera. */
export const clickSelects = (tool: Tool3D): boolean => tool !== 'orbit';

/** Whether a click makes an element: a create or place tool on empty space; on an element it selects, as Select does. */
export const clickCreates = (tool: Tool3D, element: string | undefined): boolean =>
  typeof tool === 'object' && element === undefined;

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

/** The selection a right-click acts on: an unselected element becomes the selection; otherwise it stays as it is. */
export const menuSelection = (selection: readonly string[], element: string | undefined): string[] =>
  element === undefined || selection.includes(element) ? [...selection] : [element];

/** A selected face: the element and the axis its face points out along. */
export type FaceSelection = { element: string; normal: Scene.Vec3 };

/**
 * What a double-click does: on a composite (`parts`), drill into its parts; on a plain element, select the face its
 * picked normal points out of; elsewhere, nothing.
 */
export const doubleClickTarget = (
  element: string | undefined,
  parts: string | undefined,
  normal: Scene.Vec3 | undefined,
): { drill: string } | { face: FaceSelection } | undefined =>
  element === undefined
    ? undefined
    : parts !== undefined
      ? { drill: parts }
      : normal
        ? { face: { element, normal: axisOf(normal) } }
        : undefined;

/** A face's name: the sign and axis its normal points along, e.g. `+Y` for the top. */
export const faceName = (normal: Scene.Vec3): string => {
  const { x, y, z } = axisOf(normal);
  const [axis, sign] = x !== 0 ? ['X', x] : y !== 0 ? ['Y', y] : ['Z', z];
  return `${sign > 0 ? '+' : '−'}${axis}`;
};
