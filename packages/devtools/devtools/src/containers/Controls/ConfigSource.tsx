//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Card, FormControlLabel, Switch, TextField } from '@mui/material';

import { DEFAULT_CLIENT_ORIGIN } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

export type ConfigSourceProps = {
  onConfigChange: (params: { remoteSource?: string; mode: number }) => void;
};

export const ConfigSource = ({ onConfigChange }: ConfigSourceProps) => {
  const client = useClient();
  const [remoteSource, setRemoteSource] = useState<string>(
    client.config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN
  );

  const [mode, setMode] = useState(client.config.get('runtime.client.mode') ?? 1); // local = 1, remote = 2

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.checked ? 2 : 1);
  };

  useAsyncEffect(async () => {
    await onConfigChange({ remoteSource: mode === 2 ? remoteSource : undefined, mode });
  }, [mode, remoteSource]);

  return (
    <Card sx={{ margin: 1 }}>
      <Box
        sx={{
          padding: 1,
          display: 'flex'
        }}
      >
        <FormControlLabel control={<Switch checked={mode === 2} onChange={onChange} />} label='Remote' />
        <TextField
          label='Remote Source'
          variant='standard'
          fullWidth
          value={remoteSource}
          onChange={(event) => setRemoteSource(event.target.value)}
        />
        <Button
          disabled={mode === 1}
          variant='contained'
          onClick={() => onConfigChange({ remoteSource, mode })}
          sx={{ marginLeft: 1 }}
        >
          Set
        </Button>
      </Box>
    </Card>
  );
};
