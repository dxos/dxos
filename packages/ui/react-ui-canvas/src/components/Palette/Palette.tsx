//
// Copyright 2026 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef } from 'react';

import { IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type LinkRegistry, type NodeRegistry } from '../../model/registry.ts';
import { type Capabilities, type Tool } from '../../model/types.ts';
import { nodeDragData } from '../../utils/dnd.ts';

type Entry = { tool: Tool; icon: string; label: string; key?: string };

const BASE: Entry[] = [
  { tool: { kind: 'select' }, icon: 'ph--cursor--regular', label: 'Select', key: 'V' },
  { tool: { kind: 'hand' }, icon: 'ph--hand--regular', label: 'Pan', key: 'H' },
];

/** Node types by their `group`, in registry order; types without one share the first, unnamed group. */
const nodeGroups = (nodes: NodeRegistry): Entry[][] => {
  const groups = new Map<string, Entry[]>();
  for (const def of Object.values(nodes)) {
    const name = def.group ?? '';
    groups.set(name, [
      ...(groups.get(name) ?? []),
      { tool: { kind: 'node' as const, type: def.type }, icon: def.icon, label: def.name, key: def.key },
    ]);
  }
  return [...groups.values()];
};

/**
 * Palette entries: the fixed tools, then the node types by group, then a link per link type; a group the
 * projection cannot apply (`create`, `link`) is left out rather than offered and silently dropped.
 */
export const paletteEntries = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): Entry[][] =>
  [
    BASE,
    ...(capabilities.create ? nodeGroups(nodes) : []),
    capabilities.link
      ? Object.values(links).map((def) => ({
          tool: { kind: 'link' as const, type: def.type },
          icon: def.icon,
          label: def.name,
          key: def.key,
        }))
      : [],
  ].filter((group) => group.length > 0);

export const sameTool = (left: Tool, right: Tool): boolean =>
  left.kind === right.kind && ('type' in left ? left.type === ('type' in right ? right.type : undefined) : true);

export const toolForKey = (
  nodes: NodeRegistry,
  links: LinkRegistry,
  capabilities: Capabilities,
  key: string,
): Tool | undefined =>
  paletteEntries(nodes, links, capabilities)
    .flat()
    .find((entry) => entry.key !== undefined && entry.key === key.toUpperCase())?.tool;

export type PaletteProps = {
  tool: Tool;
  nodes: NodeRegistry;
  links: LinkRegistry;
  capabilities: Capabilities;
  onToolChange: (tool: Tool) => void;
};

/**
 * Tool palette: a click picks the tool; a node type can also be dragged onto the canvas, which creates
 * it where it drops (the canvas is a pragmatic-dnd drop target for `nodeDragData`).
 */
export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: PaletteProps) => (
  <div
    className='flex flex-col rounded-sm bg-modal-surface border border-separator divide-y divide-separator'
    data-testid='palette'
  >
    {paletteEntries(nodes, links, capabilities).map((group, index) => (
      <div key={index} className='flex flex-col gap-1 p-1'>
        {group.map((entry) => (
          <PaletteButton
            key={entry.label}
            entry={entry}
            active={sameTool(tool, entry.tool)}
            onToolChange={onToolChange}
          />
        ))}
      </div>
    ))}
  </div>
);

const PaletteButton = ({
  entry,
  active,
  onToolChange,
}: {
  entry: Entry;
  active: boolean;
  onToolChange: (tool: Tool) => void;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const nodeType = entry.tool.kind === 'node' ? entry.tool.type : undefined;
  useEffect(() => {
    if (!ref.current || nodeType === undefined) {
      return;
    }
    return draggable({ element: ref.current, getInitialData: () => nodeDragData(nodeType) });
  }, [nodeType]);
  return (
    <IconButton
      ref={ref}
      variant='ghost'
      iconOnly
      icon={entry.icon}
      label={entry.key ? `${entry.label} (${entry.key})` : entry.label}
      classNames={mx(active && 'bg-primary-500/20')}
      data-testid={`palette-${entry.key ?? ('type' in entry.tool ? entry.tool.type : entry.tool.kind)}`}
      onClick={() => onToolChange(entry.tool)}
    />
  );
};
