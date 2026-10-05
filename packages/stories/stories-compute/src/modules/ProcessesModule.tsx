//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel, Toolbar } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { type ProcessItem, ProcessTile } from '../components/index.ts';
import { useCompute } from './ComputeContext.tsx';

const Tile = ({ data }: { data: ProcessItem }) => {
  const { remove } = useCompute();
  return <ProcessTile data={data} onRemove={remove} />;
};

/** Story module: a masonry of the spawned processes. */
export const ProcessesModule = () => {
  const { items } = useCompute();
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Processes: {items.length}</Toolbar.Text>
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
