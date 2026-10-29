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
