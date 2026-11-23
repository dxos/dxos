//
// Copyright 2026 DXOS.org
//

import { type ActiveTool, HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';

import { type Tool3D } from '../components/index.ts';
import { type ToolDef } from '../editor/index.ts';

const CREATE_KINDS = ['cube', 'sphere', 'cylinder', 'cone'] as const;

const KIND_ICONS: Record<(typeof CREATE_KINDS)[number], string> = {
  cube: 'ph--cube--regular',
  sphere: 'ph--circle--regular',
  cylinder: 'ph--cylinder--regular',
  cone: 'ph--triangle--regular',
};

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** The 3D rail, as 2D's: picking and the view, transforming, then the create group (shapes, then the link). */
export const TOOLS_3D: readonly ToolDef[] = [
  { id: 'select', icon: SELECT_ICON, label: 'Select', category: 'select', key: 'v' },
  { id: 'orbit', icon: HAND_ICON, label: 'Orbit', category: 'select', key: 'h' },
  { id: 'move', icon: 'ph--arrows-out-cardinal--regular', label: 'Move', category: 'transform' },
  { id: 'rotate', icon: 'ph--arrow-clockwise--regular', label: 'Rotate', category: 'transform' },
  { id: 'scale', icon: 'ph--arrows-out--regular', label: 'Scale', category: 'transform' },
  { id: 'extrude', icon: 'ph--arrow-fat-line-up--regular', label: 'Extrude', category: 'transform' },
  ...CREATE_KINDS.map((kind): ToolDef => ({
    id: kind,
    icon: KIND_ICONS[kind],
    label: capitalize(kind),
    category: 'create',
    kind,
  })),
  { id: 'link', icon: 'ph--line-segment--regular', label: 'Link', category: 'create' },
];

const SIMPLE: ReadonlySet<string> = new Set(['select', 'orbit', 'move', 'rotate', 'scale', 'extrude', 'link']);

const isSimple = (id: string): id is Extract<Tool3D, string> => SIMPLE.has(id);

/** The 3D editor's tool for the tool in hand: a create tool makes its kind; `place` places its object. */
export const toTool3D = (tool: ActiveTool): Tool3D => {
  if (tool.id === 'place' && tool.object !== undefined) {
    return { place: tool.object };
  }
  const create = TOOLS_3D.find((def) => def.id === tool.id && def.category === 'create' && def.kind !== undefined);
  if (create?.kind !== undefined) {
    return { create: create.kind };
  }
  return isSimple(tool.id) ? tool.id : 'select';
};

/** The tool in hand for a 3D editor's tool, as the rail shows it. */
export const fromTool3D = (tool: Tool3D): ActiveTool =>
  typeof tool === 'string'
    ? { id: tool }
    : 'create' in tool
      ? { id: tool.create }
      : { id: 'place', object: tool.place };
