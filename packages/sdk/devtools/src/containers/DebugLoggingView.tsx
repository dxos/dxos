//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import { useBridge } from '../hooks/bridge';

export const DebugLoggingView = () => {
  const [bridge] = useBridge();
  const [namespaces, setNamespaces] = useState('');

  useEffect(() => {
    const fetchNamespaces = async () => {
      // debug module API only allows fetching the current namespaces by calling disable()
      // so we need to then call enable() in order to restore the existing config.
      const namespacesFetched = await bridge.send('debug-logging.disable', null);
      await bridge.send('debug-logging.enable', namespacesFetched);
      setNamespaces(namespacesFetched);
    };
    fetchNamespaces().catch(console.error);
  }, []);

  const handleEnableLogging = () => {
    const allNamespaces = '*';
    setNamespaces(allNamespaces);
    bridge.send('debug-logging.enable', allNamespaces);
  };

  const handleDisableLogging = () => {
    setNamespaces('');
    bridge.send('debug-logging.disable', null);
  };

  const handleCustomLogging = async () => {
    // Disable first otherwise the new namespaces are added to the existing enabled set
    await bridge.send('debug-logging.disable', null);
    await bridge.send('debug-logging.enable', namespaces);
  };

  return (
    <span>
      <div style={{ padding: 8 }}><Button variant='outlined' size='small' onClick={handleEnableLogging}>Enable All Logging</Button></div>
      <div style={{ padding: 8 }}><Button variant='outlined' size='small' onClick={handleDisableLogging}>Disable All Logging</Button></div>
      <div style={{ padding: 8 }}><TextField onChange={ev => setNamespaces(ev.target.value)} size='small' value={namespaces} label='Current Logging Namespaces' variant='outlined' fullWidth /></div>
      <div style={{ padding: 8 }}><Button variant='outlined' size='small' onClick={handleCustomLogging}>Set Custom Logging</Button></div>
    </span>
  );
};
