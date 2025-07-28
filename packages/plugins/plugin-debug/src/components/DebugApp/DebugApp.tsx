//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useState } from 'react';

import { type Graph } from '@dxos/plugin-graph';
import { useClient, useConfig } from '@dxos/react-client';
import { ToggleGroup, ToggleGroupItem, Toolbar, Icon, IconButton } from '@dxos/react-ui';

import { Json, Tree } from './Tree';
import { Container } from '../Container';

export const DebugApp: FC<{ graph: Graph }> = ({ graph }) => {
  const [view, setView] = useState<'config' | 'diagnostics' | 'graph'>('graph');
  const [data, setData] = useState<any>({});
  const client = useClient();
  const config = useConfig();
  const handleRefresh = async () => {
    const data = await client.diagnostics({ truncate: true });
    setData(data);
  };
  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleResetClient = async (force = false) => {
    if (!force && !window.confirm('Reset storage?')) {
      return;
    }

    // TODO(burdon): Throws exception.
    await client.reset();
    window.location.href = window.location.origin;
  };

  const handleOpenDevtools = () => {
    const vaultUrl = config.values?.runtime?.client?.remoteSource;
    if (vaultUrl) {
      window.open(`https://devtools.dev.dxos.org/?target=${vaultUrl}`);
    }
  };

  return (
    <Container
      toolbar={
        <Toolbar.Root classNames='p-1'>
          <ToggleGroup type='single' value={view}>
            <ToggleGroupItem value={'graph'} onClick={() => setView('graph')} title={'Plugin graph'}>
              <Icon icon='ph--graph--regular' size={5} />
            </ToggleGroupItem>
            <ToggleGroupItem value={'diagnostics'} onClick={() => setView('diagnostics')} title={'Diagnostics'}>
              <Icon icon='ph--gauge--regular' size={5} />
            </ToggleGroupItem>
            <ToggleGroupItem value={'config'} onClick={() => setView('config')} title={'Config'}>
              <Icon icon='ph--gear--regular' size={5} />
            </ToggleGroupItem>
          </ToggleGroup>

          <Toolbar.Separator variant='gap' />
          <IconButton
            icon='ph--warning--regular'
            iconOnly
            size={5}
            classNames='text-red-700'
            onClick={(event) => handleResetClient(event.shiftKey)}
            label='Reset client'
          />
          <IconButton
            icon='ph--toolbox--duotone'
            iconOnly
            size={5}
            onClick={handleOpenDevtools}
            label='Open Devtools'
          />
        </Toolbar.Root>
      }
    >
      {view === 'graph' && <Tree data={graph.toJSON()} />}
      {view === 'config' && <Json data={data.diagnostics?.config} />}
      {view === 'diagnostics' && <Json data={data} />}
    </Container>
  );
};
