//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { PartyProxy } from '@dxos/client';

interface PartySelectProps {
  parties: PartyProxy[] // TODO(burdon): Keys?
  selected: PartyProxy | undefined
  onChange: (value: PartyProxy | undefined) => void
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
            {party.key.toHex()}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
