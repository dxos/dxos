//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { PublicKey } from '@dxos/crypto';

interface FeedSelectProps {
  keys: PublicKey[]
  selected: PublicKey | undefined
  onChange: (value: PublicKey | undefined) => void
}

export const FeedSelect = ({ keys, selected, onChange }: FeedSelectProps) => {
  return (
    <FormControl fullWidth variant='standard'>
      <InputLabel id='feed-select'>Feed</InputLabel>
      <Select
        id='feed-select'
        variant='standard'
        value={selected?.toHex() ?? ''}
        onChange={event => onChange(keys.find(key => key.equals(event.target.value)))}
        label='Feed'
      >
        {keys?.map(key => (
          <MenuItem key={key.toHex()} value={key.toHex()}>
            {key.toHex()}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

