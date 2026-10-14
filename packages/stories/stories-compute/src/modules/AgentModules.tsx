//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Masonry } from '@dxos/react-ui-masonry';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type AgentItem, AgentPromptPanel, AgentTile } from '../components/index.ts';
import { useAgents } from './AgentContext.tsx';

/** Story module: spawns an agent on a prompt at the chosen location. */
export const AgentPromptModule = () => {
  const { edge, ready, error, create } = useAgents();
  return (
    <AgentPromptPanel
      edge={edge}
      ready={ready}
      error={error}
      onCreate={(location, prompt) => create(location, { prompt })}
    />
  );
};

const Tile = ({ data }: { data: AgentItem }) => {
  const { remove } = useAgents();
  return <AgentTile data={data} onRemove={remove} />;
};

/** Story module: a masonry of the spawned agents, each with its live transcript. */
export const AgentsModule = () => {
  const { items } = useAgents();
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Agents: {items.length}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Masonry.Root Tile={Tile}>
          <Masonry.Content>
            <Masonry.Viewport items={items} getId={(item) => item.id} />
          </Masonry.Content>
        </Masonry.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
