//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React from 'react';

import type * as Process from '@dxos/compute/Process';
import { useSpaces } from '@dxos/react-client/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import { ProcessTree } from '@dxos/react-ui-trace';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { PermissionAgentTile, PermissionConfigurator } from '../components/index.ts';
import { type PermissionAgent, usePermissionAgents } from './PermissionContext.tsx';

const EMPTY_TREE = Atom.make<readonly Process.Process[]>([]);

/** Story module: the agent configurator - prompt, granted permissions and location. */
export const PermissionConfiguratorModule = () => {
  const { edge, ready, spawn } = usePermissionAgents();
  return <PermissionConfigurator edge={edge} ready={ready} onSpawn={spawn} />;
};

const Tile = ({ data }: { data: PermissionAgent }) => {
  const { processTreeAtom, remove } = usePermissionAgents();
  const [space] = useSpaces();
  return <PermissionAgentTile agent={data} db={space?.db} processTreeAtom={processTreeAtom} onRemove={remove} />;
};

/** Story module: the spawned agents side by side, so a pass and a refusal can be compared. */
export const PermissionAgentsModule = () => {
  const { agents } = usePermissionAgents();
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Agents: {agents.length}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Masonry.Root Tile={Tile}>
          <Masonry.Content>
            <Masonry.Viewport items={agents} getId={(agent) => agent.id} />
          </Masonry.Content>
        </Masonry.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

/** Story module: every process of the runtime, agents with their tool calls nested beneath. */
export const PermissionProcessTreeModule = () => {
  const { processTreeAtom } = usePermissionAgents();
  const processes = useAtomValue(processTreeAtom ?? EMPTY_TREE);
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Processes: {processes.length}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='overflow-y-auto' data-testid='permission-process-tree'>
        <ProcessTree processes={processes} depth={2} />
      </Panel.Body>
    </Panel.Root>
  );
};
