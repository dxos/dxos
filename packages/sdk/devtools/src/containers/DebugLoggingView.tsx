//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

import { useDevtoolsHost } from '../contexts';

export const DebugLoggingView = () => {
  const devtoolsHost = useDevtoolsHost();
  const [namespaces, setNamespaces] = useState('');

  useEffect(() => {
    const fetchNamespaces = async () => {
      // debug module API only allows fetching the current namespaces by calling disable()
      // so we need to then call enable() in order to restore the existing config.
      const namespacesFetched = await devtoolsHost.DisableDebugLogging({});
      await devtoolsHost.EnableDebugLogging({ namespaces: namespacesFetched?.enabledNamespaces });
      if (namespacesFetched?.enabledNamespaces) {
        setNamespaces(namespacesFetched.enabledNamespaces);
      }
    };
    fetchNamespaces().catch(console.error);
  }, []);

  const handleEnableLogging = async () => {
    const allNamespaces = '*';
    setNamespaces(allNamespaces);
    await devtoolsHost.EnableDebugLogging({ namespaces: allNamespaces });
  };

  const handleDisableLogging = async () => {
    setNamespaces('');
    await devtoolsHost.DisableDebugLogging({});
  };

  const handleCustomLogging = async () => {
    // Disable first otherwise the new namespaces are added to the existing enabled set
    await devtoolsHost.DisableDebugLogging({});
    await devtoolsHost.EnableDebugLogging({ namespaces });
  };

  return (
    <span>
      <div style={{ padding: 8 }}><Button variant="outlined" size="small" onClick={handleEnableLogging}>Enable All Logging</Button></div>
      <div style={{ padding: 8 }}><Button variant="outlined" size="small" onClick={handleDisableLogging}>Disable All Logging</Button></div>
      <div style={{ padding: 8 }}><TextField onChange={ev => setNamespaces(ev.target.value)} size="small" value={namespaces} label="Current Logging Namespaces" variant="outlined" fullWidth /></div>
      <div style={{ padding: 8 }}><Button variant="outlined" size="small" onClick={handleCustomLogging}>Set Custom Logging</Button></div>
    </span>
  );
};
