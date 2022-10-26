//
// Copyright 2020 DXOS.org
//

import React, { ChangeEvent, useEffect, useState } from 'react';

import { Box, FormControlLabel, Switch, TextField } from '@mui/material';

import { useDevtools } from '@dxos/react-client';

export const LoggingPanel = () => {
  const devtoolsHost = useDevtools();
  const [enabled, setEnabled] = useState(false);
  const [namespaces, setNamespaces] = useState('');

  useEffect(() => {
    /*
     * Debug module API only allows fetching the current namespaces by calling disable()
     * so we need to then call enable() in order to restore the existing config.
     */
    const fetchNamespaces = async () => {
      const namespacesFetched = await devtoolsHost.disableDebugLogging({});
      await devtoolsHost.enableDebugLogging({ namespaces: namespacesFetched?.enabledNamespaces });
      if (namespacesFetched?.enabledNamespaces) {
        setNamespaces(namespacesFetched.enabledNamespaces);
      }
    };

    fetchNamespaces().catch(console.error);
  }, []);

  const handleUpdate = () => {
    setTimeout(async () => {
      if (enabled) {
        // Disable first otherwise the new namespaces are added to the existing enabled set.
        await devtoolsHost.disableDebugLogging({});
        await devtoolsHost.enableDebugLogging({ namespaces: namespaces || '*' });
      } else {
        await devtoolsHost.disableDebugLogging({});
      }
    });
  };

  useEffect(() => {
    handleUpdate();
  }, [enabled]);

  useEffect(() => {
    const t = setTimeout(() => {
      handleUpdate();
    }, 2000);

    return () => clearTimeout(t);
  }, [namespaces]);

  const handleEnabled = async (event: ChangeEvent<HTMLInputElement>) => {
    setEnabled(event.target.checked);
  };

  return (
    <Box sx={{ display: 'flex', padding: 1 }}>
      <TextField
        variant='outlined'
        value={namespaces}
        onChange={event => setNamespaces(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setNamespaces('');
          }
        }}
        placeholder='Filter (ESC to cancel)'
        disabled={!enabled}
        size='small'
        fullWidth
        spellCheck={false}
        sx={{
          marginRight: 3
        }}
      />

      <FormControlLabel
        control={<Switch value={enabled} onChange={handleEnabled} />}
        label='Enabled'
      />
    </Box>
  );
};
