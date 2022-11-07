//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, Button, Card, FormControlLabel, Switch, TextField } from '@mui/material';

import { DEFAULT_CLIENT_ORIGIN } from '@dxos/client';

export type ConfigSourceProps = {
  onSource: (params: { remoteSource?: string; mode: number }) => void;
};

export const ConfigSource = ({ onSource }: ConfigSourceProps) => {
  const [remoteSource, setRemoteSource] = useState<string>(DEFAULT_CLIENT_ORIGIN);

  const [mode, setMode] = useState(1); // local = 1, remote = 2

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.checked ? 2 : 1);
  };

  useEffect(() => {
    onSource({ remoteSource: mode === 2 ? remoteSource : undefined, mode });
  }, [mode]);

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
          onClick={() => onSource({ remoteSource, mode })}
          sx={{ marginLeft: 1 }}
        >
          Set
        </Button>
      </Box>
    </Card>
  );
};
