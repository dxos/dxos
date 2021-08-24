//
// Copyright 2020 DXOS.org
//

import React from 'react';

import Button from '@material-ui/core/Button';

import { useBridge } from '../hooks/bridge';

export default function StorageTab () {
  const [bridge] = useBridge();

  async function handleReset () {
    if (window.confirm('RESET ALL DATA (CANNOT BE UNDONE)?')) {
      await bridge.send('storage.reset');
    }
  }

  return (
    <div style={{ padding: 8 }}>
      <Button variant='outlined' size='small' onClick={handleReset}>Reset storage</Button>
    </div>
  );
}
