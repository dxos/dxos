//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { HashIcon } from '@dxos/react-components';

interface KeySelectProps {
  id?: string
  label?: string
  keys: PublicKey[]
  selected: PublicKey | undefined
  onChange: (value: PublicKey | undefined) => void
}

export const KeySelect = ({
  id = 'key-select',
  label = 'Key',
  keys,
  selected,
  onChange
}: KeySelectProps) => (
  <FormControl fullWidth variant='standard'>
    <InputLabel id={id}>{label}</InputLabel>
    <Select
      id={id}
      label={label}
      variant='standard'
      value={selected?.toHex() ?? ''}
      onChange={event => onChange(keys.find(key => key.equals(event.target.value)))}
    >
      {keys.map(key => (
        <MenuItem key={key.toHex()} value={key.toHex()}>
          <Box sx={{ display: 'flex' }}>
            <HashIcon value={key.toHex()} />
            <Typography variant='h6' sx={{ marginLeft: 2, fontFamily: 'monospace' }}>
              {truncateKey(key.toHex(), 8)}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
