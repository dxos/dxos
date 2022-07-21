//
// Copyright 2021 DXOS.org
//

import React from 'react';

import {
  FormControl, InputLabel, MenuItem, Select, SelectChangeEvent
} from '@mui/material';

/**
 * Displays contact selector.
 */
export const ContactsSelector = ({ contacts, selected = '', onSelect }: {
  contacts: any[],
  selected?: string,
  onSelect: (selected: string) => void
}) => (
  <FormControl fullWidth>
    <InputLabel id='contact-select-label'>Contact</InputLabel>
    <Select
      value={selected || ''}
      label='Contact'
      labelId='contact-select-label'
      onChange={(event: SelectChangeEvent) => onSelect(event.target.value)}
    >
      <MenuItem value='' />
      {contacts.map(contact => (
        <MenuItem key={contact.publicKey.toHex()} value={contact.publicKey.toHex()}>
          {contact.displayName}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
