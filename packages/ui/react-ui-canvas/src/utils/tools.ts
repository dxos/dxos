//
// Copyright 2026 DXOS.org
//

import { type Capabilities, type LinkRegistry, type NodeRegistry, type Tool } from '../model/index.ts';

/** A tool the rail offers, with its icon, label and key; `T` is the host's own tool value (the 2D canvas's `Tool`). */
export type ToolEntry<T = Tool> = { tool: T; icon: string; label: string; key?: string };

/** The select tool's icon, which every scene view's rail uses. */
export const SELECT_ICON = 'ph--cursor--regular';

/** The hand: 2D pans with it, 3D orbits with it, so a rail reads the same in either. */
export const HAND_ICON = 'ph--hand--regular';

const BASE: ToolEntry[] = [
  { tool: { kind: 'select' }, icon: SELECT_ICON, label: 'Select', key: 'V' },
  { tool: { kind: 'hand' }, icon: HAND_ICON, label: 'Pan', key: 'H' },
];

/** The group of the fixed tools, which the rail ends with the read-only toggle. */
export const TOOLS_GROUP = 'Tools';

/** The group of the tools that make elements — the shapes, then the link — in both dimensions' rails. */
export const CREATE_GROUP = 'Create';

/**
 * A run of palette entries; a group of node types may fold into one flyout button when the rail runs out of room, and
 * a `folded` group always does.
 */
export type ToolGroup<T = Tool> = { name: string; entries: ToolEntry<T>[]; collapsible: boolean; folded?: boolean };

/** Node types by their `group`, in registry order; types without one share the first, unnamed group. */
const nodeGroups = (nodes: NodeRegistry): ToolGroup[] => {
  const groups = new Map<string, ToolEntry[]>();
  for (const def of Object.values(nodes).filter((def) => def.palette !== false)) {
    const name = def.group ?? '';
    groups.set(name, [
      ...(groups.get(name) ?? []),
      { tool: { kind: 'node' as const, type: def.type }, icon: def.icon, label: def.name, key: def.key },
    ]);
  }
  return [...groups.entries()].map(([name, entries]) => ({ name, entries, collapsible: entries.length > 1 }));
};

/**
 * Tool groups: the fixed tools, then the create group (the shapes and the link types), then the other node types by
 * group; a tool the projection cannot apply (`create`, `link`) is left out rather than offered and silently dropped.
 * Groups fold into a flyout when the rail runs out of room.
 */
export const toolGroups = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): ToolGroup[] => {
  const linkEntries: ToolEntry[] = capabilities.link
    ? Object.values(links).map((def) => ({
        tool: { kind: 'link' as const, type: def.type },
        icon: def.icon,
        label: def.name,
        key: def.key,
      }))
    : [];
  // The first (unnamed) node group is the shapes: it becomes the create group, which the link tools end.
  const [shapes, ...others] = capabilities.create ? nodeGroups(nodes) : [];
  const create = [...(shapes?.name === '' ? shapes.entries : []), ...linkEntries];
  return [
    { name: TOOLS_GROUP, entries: BASE, collapsible: false },
    { name: CREATE_GROUP, entries: create, collapsible: create.length > 1 },
    ...(shapes && shapes.name !== '' ? [shapes] : []),
    ...others,
  ].filter((group) => group.entries.length > 0);
};

/** Tool entries by group, flat within each. */
export const toolEntries = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): ToolEntry[][] =>
  toolGroups(nodes, links, capabilities).map((group) => group.entries);

/** Whether a press on an element selects (and drags) it: with Select, and with a create tool, which makes only on empty space. */
export const pressSelects = (tool: Tool): boolean => tool.kind === 'select' || tool.kind === 'node';

export const sameTool = (left: Tool, right: Tool): boolean =>
  left.kind === right.kind && ('type' in left ? left.type === ('type' in right ? right.type : undefined) : true);

/** The tool a key picks, among those the projection can apply. */
export const toolForKey = (
  nodes: NodeRegistry,
  links: LinkRegistry,
  capabilities: Capabilities,
  key: string,
): Tool | undefined =>
  toolEntries(nodes, links, capabilities)
    .flat()
    .find((entry) => entry.key !== undefined && entry.key === key.toUpperCase())?.tool;
