//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Tool } from './types.ts';

const TOOLS: { tool: Tool; icon: string; label: string; key: string }[] = [
  { tool: 'select', icon: 'ph--cursor--regular', label: 'Select', key: 'V' },
  { tool: 'hand', icon: 'ph--hand--regular', label: 'Pan', key: 'H' },
  { tool: 'rect', icon: 'ph--rectangle--regular', label: 'Rectangle', key: 'R' },
  { tool: 'text', icon: 'ph--text-t--regular', label: 'Text', key: 'T' },
  { tool: 'scene', icon: 'ph--frame-corners--regular', label: 'Scene', key: 'S' },
  { tool: 'link', icon: 'ph--line-segment--regular', label: 'Link', key: 'L' },
];

export const toolForKey = (key: string): Tool | undefined =>
  TOOLS.find((entry) => entry.key === key.toUpperCase())?.tool;

export type PaletteProps = {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
};

/** Minimal tool palette for the stories; the plugin toolbar owns this in the app (open question 3). */
export const Palette = ({ tool, onToolChange }: PaletteProps) => (
  <div className='flex flex-col gap-1 p-1 rounded-sm bg-modal-surface border border-separator'>
    {TOOLS.map((entry) => (
      <IconButton
        key={entry.tool}
        variant='ghost'
        iconOnly
        icon={entry.icon}
        label={`${entry.label} (${entry.key})`}
        classNames={mx(tool === entry.tool && 'bg-primary-500/20')}
        onClick={() => onToolChange(entry.tool)}
      />
    ))}
  </div>
);
