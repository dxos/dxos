//
// Copyright 2026 DXOS.org
//

import { CREATE_GROUP, HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';
import { type Tool3D } from '@dxos/react-ui-scene';

const CREATE_KINDS = ['cube', 'sphere', 'cylinder', 'cone'] as const;

const KIND_ICONS: Record<(typeof CREATE_KINDS)[number], string> = {
  cube: 'ph--cube--regular',
  sphere: 'ph--circle--regular',
  cylinder: 'ph--cylinder--regular',
  cone: 'ph--triangle--regular',
};

/** The rail's groups, as 2D's: picking and the view, transforming, then the create group (shapes, then the link). */
export const TOOL_GROUPS_3D: readonly {
  name: string;
  entries: readonly { id: string; tool: Tool3D; icon: string }[];
}[] = [
  {
    name: 'Tools',
    entries: [
      { id: 'select', tool: 'select', icon: SELECT_ICON },
      { id: 'orbit', tool: 'orbit', icon: HAND_ICON },
    ],
  },
  {
    name: 'Transform',
    entries: [
      { id: 'move', tool: 'move', icon: 'ph--arrows-out-cardinal--regular' },
      { id: 'rotate', tool: 'rotate', icon: 'ph--arrow-clockwise--regular' },
      { id: 'scale', tool: 'scale', icon: 'ph--arrows-out--regular' },
      { id: 'extrude', tool: 'extrude', icon: 'ph--arrow-fat-line-up--regular' },
    ],
  },
  {
    name: CREATE_GROUP,
    entries: [
      ...CREATE_KINDS.map((kind) => ({ id: kind, tool: { create: kind }, icon: KIND_ICONS[kind] })),
      { id: 'link', tool: 'link', icon: 'ph--line-segment--regular' },
    ],
  },
];
