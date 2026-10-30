//
// Copyright 2026 DXOS.org
//

import {
  type ActiveTool,
  type LinkRegistry,
  type NodeRegistry,
  type Tool,
  type ToolDef,
  TOOLS_GROUP,
  defaultLinkRegistry,
  defaultNodeRegistry,
  freehandCapabilities,
  nodeDragData,
  toolGroups,
} from '@dxos/react-ui-canvas';
import { type LinkType } from '@dxos/scene';

const LINK_TYPES = ['line', 'curve', 'spline', 'smart'] as const satisfies readonly LinkType[];

/** A 2D engine tool as the editor's tool id: `select`, `hand`, `node:<type>` or `link:<type>`. */
const toolId = (tool: Tool): string =>
  tool.kind === 'node' || tool.kind === 'link' ? `${tool.kind}:${tool.type}` : tool.kind;

/** The editor's tool as the 2D engine's; an id the engine has no tool for selects. */
export const toTool2D = ({ id }: ActiveTool): Tool => {
  const [kind, type] = id.split(':');
  if (kind === 'hand') {
    return { kind: 'hand' };
  }
  if (kind === 'node' && type) {
    return { kind, type };
  }
  const link = kind === 'link' ? LINK_TYPES.find((candidate) => candidate === type) : undefined;
  if (link) {
    return { kind: 'link', type: link };
  }
  return { kind: 'select' };
};

/** The 2D engine's tool as the editor's. */
export const fromTool2D = (tool: Tool): ActiveTool => ({ id: toolId(tool) });

/**
 * The 2D rail, as the canvas's palette groups it: select and pan, the create group (shapes, then the link types in one
 * flyout), and any further node groups by name.
 */
export const tools2D = (
  nodes: NodeRegistry = defaultNodeRegistry,
  links: LinkRegistry = defaultLinkRegistry,
): ToolDef[] =>
  toolGroups(nodes, links, freehandCapabilities).flatMap((group) =>
    group.entries.map((entry) => ({
      id: toolId(entry.tool),
      icon: entry.icon,
      label: entry.label,
      category: group.name === TOOLS_GROUP ? ('select' as const) : ('create' as const),
      group: group.name,
      ...(entry.tool.kind === 'node' ? { kind: entry.tool.type } : {}),
      ...(entry.key ? { key: entry.key } : {}),
      ...(entry.fold ? { fold: entry.fold } : {}),
    })),
  );

/** A node tool drags a node of its type onto the canvas, as the canvas's palette did; other tools do not drag. */
export const toolDragData2D = (tool: ToolDef): Record<string, unknown> | undefined =>
  tool.id.startsWith('node:') && tool.kind ? nodeDragData(tool.kind) : undefined;
