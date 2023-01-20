//
// Copyright 2020 DXOS.org
//

import React, { SyntheticEvent } from 'react';

import { Autocomplete as MuiAutocomplete, TextField } from '@mui/material';

export interface AutocompleteProps {
  label: string
  value?: string
  options: string[]
  onUpdate: (value?: string) => void
}

/**
 * Simple wrapper.
 */
export const Autocomplete = ({
  label,
  value,
  options = [],
  onUpdate
}: AutocompleteProps) => (
  <MuiAutocomplete
    size='small'
    freeSolo
    autoComplete
    clearOnEscape
    value={value || null}
    options={options}
    getOptionLabel={option => option}
    onChange={(event: SyntheticEvent, value: string | null) => {
      onUpdate(value || undefined);
    }}
    renderInput={params => (
      <TextField
        {...params}
        label={label}
        variant='outlined'
        fullWidth
      />
    )}
  />
);
