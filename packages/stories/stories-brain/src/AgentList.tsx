//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Profile } from '@dxos/crawler';
import { IconButton, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, Listbox } from '@dxos/react-ui-list';

export type AgentListProps = ThemedClassName<{
  agents: Profile[];
  /** Selected agent id; `undefined` means no filter (show every fact). */
  selected?: string;
  onSelect: (id: string | undefined) => void;
}>;

/**
 * Agent column: the crawl's resolved agents as a single-select listbox. Selecting an agent filters
 * the facts view to that agent's attributions; the toolbar's clear button resets to "all".
 * Multi-select is a follow-up (the `useListSelection` aspect supports it; `Listbox` does not yet).
 */
export const AgentList = ({ agents, selected, onSelect, classNames }: AgentListProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text classNames='grow'>Agents{agents.length > 0 ? ` (${agents.length})` : ''}</Toolbar.Text>
        <IconButton
          icon='ph--x--regular'
          iconOnly
          label='Clear'
          disabled={!selected}
          onClick={() => onSelect(undefined)}
        />
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content classNames='overflow-auto'>
      {agents.length === 0 ? (
        <Empty icon='ph--users--regular' label='No agents yet.' />
      ) : (
        <Listbox.Root value={selected} onValueChange={onSelect}>
          <Listbox.Content aria-label='Agents'>
            {agents.map((agent) => (
              <Listbox.Item classNames='gap-2' key={agent.id} id={agent.id}>
                <Listbox.ItemLabel>{agent.label ?? agent.id}</Listbox.ItemLabel>
                <span className='shrink-0 text-subdued tabular-nums'>{agent.messageCount}</span>
                <Listbox.Indicator />
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Root>
      )}
    </Panel.Content>
  </Panel.Root>
);
