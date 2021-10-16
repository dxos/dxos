//
// Copyright 2021 DXOS.org
//

import {
  FormControl, InputLabel, MenuItem, Select, SelectChangeEvent
} from '@mui/material';
import React from 'react';

/**
 * Displays contact selector.
 */
export const ContactsSelector = ({ contacts, selected = '', onSelect }: {
  contacts: any[],
  selected?: string,
  onSelect: (selected: string) => void
}) => {
  return (
    <FormControl fullWidth>
      <InputLabel id='contact-select-label'>Contact</InputLabel>
      <Select
        value={selected || ''}
        label='Contact'
        labelId='contact-select-label'
        onChange={(event: SelectChangeEvent) => onSelect(event.target.value)}
      >
        <MenuItem value=''>N/A</MenuItem>
        {contacts.map(contact => (
          <MenuItem key={contact.publicKey.toHex()} value={contact.publicKey.toHex()}>
            {contact.displayName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
