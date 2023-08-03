//
// Copyright 2023 DXOS.org
//

import { Download } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useFileDownload } from '@dxos/react-appkit';
import { useClient } from '@dxos/react-client';

import { JsonView, PanelContainer, Toolbar } from '../../components';

const ConfigPanel = () => {
  const client = useClient();
  const fileDownload = useFileDownload();

  const [data, setData] = useState({});
  useEffect(() => {
    void handleRefresh();
  }, []);
  const handleRefresh = async () => {
    const data = await client.diagnostics({ humanize: false, truncate: true });
    setData(data);
  };

  const handleDownload = async () => {
    fileDownload(new Blob([JSON.stringify(data, undefined, 2)], { type: 'text/plain' }), 'diagnostics.json');
  };

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <Button onClick={handleRefresh}>Refresh</Button>
          <Button onClick={handleDownload}>
            <Download className={getSize(5)} />
            <span className='m-2'>Download</span>
          </Button>
        </Toolbar>
      }
    >
      <JsonView data={data} level={5} />
    </PanelContainer>
  );
};

export default ConfigPanel;
