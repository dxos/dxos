//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Card, FormControlLabel, Switch, TextField } from '@mui/material';

import { DEFAULT_CLIENT_ORIGIN } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

export type ConfigSourceProps = {
  onConfigChange: (remoteSource?: string) => void;
};

export const ConfigSource = ({ onConfigChange }: ConfigSourceProps) => {
  const client = useClient();
  const [remoteSource, setRemoteSource] = useState<string>(
    client.config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN
  );

  const [remote, setRemote] = useState(Boolean(client.config.get('runtime.client.remoteSource')));

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRemote(event.target.checked);
  };

  useAsyncEffect(async () => {
    await onConfigChange(remote ? remoteSource : undefined);
  }, [remote, remoteSource]);

  return (
    <Card sx={{ margin: 1 }}>
      <Box
        sx={{
          padding: 1,
          display: 'flex'
        }}
      >
        <FormControlLabel control={<Switch checked={remote} onChange={onChange} />} label='Remote' />
        <TextField
          label='Remote Source'
          variant='standard'
          fullWidth
          value={remoteSource}
          onChange={(event) => setRemoteSource(event.target.value)}
        />
        <Button disabled={!remote} variant='contained' onClick={() => onConfigChange()} sx={{ marginLeft: 1 }}>
          Set
        </Button>
      </Box>
    </Card>
  );
};
