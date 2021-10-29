//
// Copyright 2020 DXOS.org
//

import { Button, TextField } from '@mui/material';
import React, { useState } from 'react';

import { Dialog } from '@dxos/react-components';

/**
 * Dialog to export keyring to file.
 */
export const ExportDialog = ({
  open,
  onClose,
  filename,
  encrypter
}: {
  open: boolean,
  onClose: () => void,
  filename: string,
  encrypter: (passphrase: string) => Promise<string>,
}) => {
  const [error, setError] = useState<string>();
  const minLength = 8;

  let passphrase = '';
  const handleChange = (event: React.SyntheticEvent) => {
    passphrase = (event.target as HTMLTextAreaElement).value.trim();
  };

  const handleExport = async () => {
    if (passphrase.length < minLength) {
      setError(`The passphrase must have more than ${minLength} characters.`);
      return;
    }

    const encrypted = await encrypter(passphrase);
    const file = new Blob([encrypted], { type: 'text/plain' });

    const element = document.createElement('a');
    element.href = URL.createObjectURL(file);
    element.download = `${filename}`;
    element.click();

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title='Export Keys'
      content={() => (
        <TextField
          autoFocus
          fullWidth
          error={!!error}
          helperText={error}
          label='Passphrase'
          onChange={handleChange}
        />
      )}
      actions={() => (
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant='contained' color='primary' onClick={handleExport}>Export</Button>
        </>
      )}
    />
  );
};
