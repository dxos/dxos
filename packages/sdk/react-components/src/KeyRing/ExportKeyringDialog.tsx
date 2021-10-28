//
// Copyright 2020 DXOS.org
//

import { Button, TextField, } from '@mui/material';
import React, { useState } from 'react';

import { CustomizableDialog } from '../CustomizableDialog';

/**
 * Dialog to export keyring to file.
 */
export const ExportKeyringDialog = ({
  open,
  topic,
  encrypter,
  onClose
}: {
  open: boolean,
  topic: string,
  encrypter: (passphrase: string) => string,
  onClose: () => void
}) => {
  const [error, setError] = useState<string>();

  let passphrase = '';
  const handleChange = (event: React.SyntheticEvent) => {
    passphrase = (event.target as HTMLTextAreaElement).value.trim();
  };

  const handleExport = async () => {
    const minLength = 8;
    if (passphrase.length < minLength) {
      setError(`The passphrase must have more than ${minLength} characters.`);
      return;
    }

    const encrypted = encrypter(passphrase);
    const file = new Blob([encrypted], { type: 'text/plain' });

    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `${topic}.keyring`;
    element.click();

    onClose();
  };

  return (
    <CustomizableDialog
      open={open}
      onClose={onClose}
      title='Export Keys'
      content={(
        <TextField
          autoFocus
          fullWidth
          error={!!error}
          helperText={error}
          label='Passphrase'
          onChange={handleChange}
        />
      )}
      actions={(
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant='contained' color='primary' onClick={handleExport}>Export</Button>
        </>
      )}
    />
  );
};
