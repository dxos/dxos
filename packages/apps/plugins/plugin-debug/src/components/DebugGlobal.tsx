//
// Copyright 2023 DXOS.org
//

import { Gauge, Graph as GraphIcon, Gear, Toolbox, Warning } from '@phosphor-icons/react';
import React, { type FC, useEffect, useState } from 'react';

import { type Graph } from '@braneframe/plugin-graph';
import { useClient, useConfig } from '@dxos/react-client';
import { Button, ToggleGroup, ToggleGroupItem, useThemeContext } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { DebugPanel } from './DebugPanel';
import { Json, Tree } from './Tree';

const DebugGlobal: FC<{ graph: Graph }> = ({ graph }) => {
  const { themeMode } = useThemeContext();
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
    <DebugPanel
      menu={
        <>
          <ToggleGroup type='single' value={view}>
            <ToggleGroupItem value={'graph'} onClick={() => setView('graph')} title={'Plugin graph'}>
              <GraphIcon className={getSize(5)} />
            </ToggleGroupItem>
            <ToggleGroupItem value={'diagnostics'} onClick={() => setView('diagnostics')} title={'Diagnostics'}>
              <Gauge className={getSize(5)} />
            </ToggleGroupItem>
            <ToggleGroupItem value={'config'} onClick={() => setView('config')} title={'Config'}>
              <Gear className={getSize(5)} />
            </ToggleGroupItem>
          </ToggleGroup>

          <div className='grow' />
          <Button onClick={(event) => handleResetClient(event.shiftKey)} title='Reset client'>
            <Warning className={mx(getSize(5), 'text-red-700')} />
          </Button>
          <Button onClick={handleOpenDevtools} title='Open Devtools'>
            <Toolbox weight='duotone' className={mx(getSize(5), 'text-700')} />
          </Button>
        </>
      }
    >
      {view === 'graph' && <Tree data={graph.toJSON()} />}
      {view === 'config' && <Json theme={themeMode} data={data.diagnostics?.config} />}
      {view === 'diagnostics' && <Json theme={themeMode} data={data} />}
    </DebugPanel>
  );
};

export default DebugGlobal;
