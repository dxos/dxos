//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

import { Avatar } from '../Avatar';

interface KeySelectProps {
  id?: string;
  label?: string;
  keys: PublicKey[];
  selected: PublicKey | undefined;
  onChange: (value: PublicKey | undefined) => void;
  humanize?: boolean;
}

export const KeySelect = ({
  id = 'key-select',
  label = 'Key',
  keys,
  selected,
  onChange,
  humanize: humanizeFlag = false
}: KeySelectProps) => (
  <FormControl fullWidth variant='standard'>
    <InputLabel id={id}>{label}</InputLabel>
    <Select
      id={id}
      label={label}
      variant='standard'
      value={selected?.toHex() ?? ''}
      onChange={(event) => onChange(keys.find((key) => key.equals(event.target.value)))}
    >
      {keys.map((key) => (
        <MenuItem key={key.toHex()} value={key.toHex()}>
          <Box
            sx={{
              display: 'flex',
              position: 'relative',
              alignItems: 'center'
            }}
          >
            <Avatar size={12} fallbackValue={key.toHex()} />
            <Typography
              sx={{
                marginLeft: 2,
                fontFamily: 'monospace'
              }}
              variant='h6'
            >
              {humanizeFlag ? humanize(key.toHex()) : truncateKey(key.toHex(), 8)}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
