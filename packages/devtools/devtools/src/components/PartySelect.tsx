//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { PartyProxy } from '@dxos/client';

interface PartySelectProps {
  parties: PartyProxy[] // TODO(burdon): Should be keys.
  value: PartyProxy | undefined
  onChange: (newValue: PartyProxy | undefined) => void
}

export const PartySelect = ({ parties, value, onChange }: PartySelectProps) => (
  <FormControl
    fullWidth
    variant='standard'
  >
    <InputLabel id='party-select'>Party</InputLabel>
    <Select
      id='party-select'
      label='Party'
      variant='standard'
      value={value?.key.toHex() ?? ''}
      onChange={(event) => onChange(parties.find(p => p.key.equals(event.target.value)))}
    >
      {parties.map((party) => (
        <MenuItem key={party.key.toHex()} value={party.key.toHex()}>
          {party.key.toHex()}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
