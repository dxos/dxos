//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';

import { Party } from '@dxos/client';
import { truncateString } from '@dxos/debug';
import { HashIcon } from '@dxos/react-components';

interface PartySelectProps {
  parties: Party[] // TODO(burdon): Keys?
  selected: Party | undefined
  onChange: (value: Party | undefined) => void
}

export const PartySelect = ({ parties, selected, onChange }: PartySelectProps) => {
  return (
    <FormControl fullWidth variant='standard'>
      <InputLabel id='party-select'>Party</InputLabel>
      <Select
        id='party-select'
        variant='standard'
        value={selected?.key.toHex() ?? ''}
        onChange={event => onChange(parties.find(p => p.key.equals(event.target.value)))}
        label='Party'
      >
        {parties.map(party => (
          <MenuItem key={party.key.toHex()} value={party.key.toHex()}>
            <Box sx={{ display: 'flex' }}>
              <HashIcon value={party.key.toHex()} />
              <Typography variant='h6' sx={{ marginLeft: 2, fontFamily: 'monospace' }}>
                {truncateString(party.key.toHex(), 8)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
