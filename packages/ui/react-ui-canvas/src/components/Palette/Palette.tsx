//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type LinkRegistry, type NodeRegistry } from '../../model/registry.ts';
import { type Capabilities, type Tool } from '../../model/types.ts';

type Entry = { tool: Tool; icon: string; label: string; key: string };

const BASE: Entry[] = [
  { tool: { kind: 'select' }, icon: 'ph--cursor--regular', label: 'Select', key: 'V' },
  { tool: { kind: 'hand' }, icon: 'ph--hand--regular', label: 'Pan', key: 'H' },
];

/**
 * Palette entries: the fixed tools, then a shape per node type, then a link per link type; a group the
 * projection cannot apply (`create`, `link`) is left out rather than offered and silently dropped.
 */
export const paletteEntries = (nodes: NodeRegistry, links: LinkRegistry, capabilities: Capabilities): Entry[][] =>
  [
    BASE,
    capabilities.create
      ? Object.values(nodes).map((def) => ({
          tool: { kind: 'node' as const, type: def.type },
          icon: def.icon,
          label: def.name,
          key: def.key,
        }))
      : [],
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
    .find((entry) => entry.key === key.toUpperCase())?.tool;

export type PaletteProps = {
  tool: Tool;
  nodes: NodeRegistry;
  links: LinkRegistry;
  capabilities: Capabilities;
  onToolChange: (tool: Tool) => void;
};

/** Minimal tool palette for the stories; the plugin toolbar owns this in the app (open question 3). */
export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: PaletteProps) => (
  <div className='flex flex-col rounded-sm bg-modal-surface border border-separator divide-y divide-separator'>
    {paletteEntries(nodes, links, capabilities).map((group, index) => (
      <div key={index} className='flex flex-col gap-1 p-1'>
        {group.map((entry) => (
          <IconButton
            key={entry.label}
            variant='ghost'
            iconOnly
            icon={entry.icon}
            label={`${entry.label} (${entry.key})`}
            classNames={mx(sameTool(tool, entry.tool) && 'bg-primary-500/20')}
            onClick={() => onToolChange(entry.tool)}
          />
        ))}
      </div>
    ))}
  </div>
);
