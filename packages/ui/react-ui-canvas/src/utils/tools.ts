//
// Copyright 2026 DXOS.org
//

import { type Capabilities, type LinkRegistry, type NodeRegistry, type Tool } from '../model/index.ts';

/** A tool the rail offers, with its icon, label and key; `T` is the host's own tool value (the 2D canvas's `Tool`). */
export type ToolEntry<T = Tool> = { tool: T; icon: string; label: string; key?: string };

const BASE: ToolEntry[] = [
  { tool: { kind: 'select' }, icon: 'ph--cursor--regular', label: 'Select', key: 'V' },
  { tool: { kind: 'hand' }, icon: 'ph--hand--regular', label: 'Pan', key: 'H' },
];

/** The group of the fixed tools, which the rail ends with the read-only toggle. */
export const TOOLS_GROUP = 'Tools';

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
 * Tool groups: the fixed tools, then the node types by group, then a link per link type; a group the projection
 * cannot apply (`create`, `link`) is left out rather than offered and silently dropped. Node groups fold when the rail
 * runs out of room; the link types always share one flyout, since a drawing mostly uses one of them.
 */
export const toolGroups = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): ToolGroup[] =>
  [
    { name: TOOLS_GROUP, entries: BASE, collapsible: false },
    ...(capabilities.create ? nodeGroups(nodes) : []),
    {
      name: 'Links',
      entries: capabilities.link
        ? Object.values(links).map((def) => ({
            tool: { kind: 'link' as const, type: def.type },
            icon: def.icon,
            label: def.name,
            key: def.key,
          }))
        : [],
      collapsible: true,
      folded: true,
    },
  ].filter((group) => group.entries.length > 0);

/** Tool entries by group, flat within each. */
export const toolEntries = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): ToolEntry[][] =>
  toolGroups(nodes, links, capabilities).map((group) => group.entries);

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
