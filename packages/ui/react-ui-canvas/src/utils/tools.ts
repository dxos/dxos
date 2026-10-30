//
// Copyright 2026 DXOS.org
//

import { type Capabilities, type LinkRegistry, type NodeRegistry, type Tool } from '../model/index.ts';

/**
 * A tool the rail offers, with its icon, label and key; `T` is the host's own tool value (the 2D canvas's `Tool`).
 * Adjacent entries of a group that name the same `fold` share one flyout button.
 */
export type ToolEntry<T = Tool> = { tool: T; icon: string; label: string; key?: string; fold?: string };

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

/** The fold the link types share, since a drawing mostly uses one of them. */
export const LINK_FOLD = 'Link';

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
        fold: LINK_FOLD,
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

/** A group's entries as the rail lays them out flat: single tools, and each run of entries sharing a fold as one group. */
export type ToolRun<T = Tool> = { entry: ToolEntry<T> } | { fold: ToolGroup<T> };

export const foldRuns = <T>(entries: readonly ToolEntry<T>[]): ToolRun<T>[] =>
  entries.reduce<ToolRun<T>[]>((runs, entry) => {
    const last = runs.at(-1);
    if (entry.fold === undefined) {
      return [...runs, { entry }];
    }
    if (last && 'fold' in last && last.fold.name === entry.fold) {
      return [...runs.slice(0, -1), { fold: { ...last.fold, entries: [...last.fold.entries, entry] } }];
    }
    return [...runs, { fold: { name: entry.fold, entries: [entry], collapsible: true } }];
  }, []);

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
