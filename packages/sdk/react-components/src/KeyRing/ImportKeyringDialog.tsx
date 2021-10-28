//
// Copyright 2020 DXOS.org
//

import { Alert, Button, TextField } from '@mui/material/Button';
import assert from 'assert';
import React, { useState, useRef } from 'react';

import { CustomizableDialog } from '../CustomizableDialog';

/**
 * Dialog to import keyring from file.
 */
export const ImportKeyringDialog = ({
  open,
  onClose,
  decrypter
}: {
  open: boolean,
  onClose: () => void,
  decrypter: (
    text: string | ArrayBuffer | null,
    passphrase: number
  ) => string
}) => {
  const buttonRef = useRef(null);
  const fileRef = useRef(null);
  const [passphrase, setPassphrase] = useState(0);
  const [error, setError] = useState(false);

  const handlePassChange = (event: React.SyntheticEvent) => {
    setPassphrase(parseInt((event.target as HTMLTextAreaElement).value));
  };

  const handleFileChange = (event: React.SyntheticEvent) => {
    assert(event.target);
    const input = event.target as HTMLInputElement;

    assert(input.files);
    const file = input.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await decrypter((event.target as FileReader).result, passphrase);
          // TODO(burdon): Pass through global action handler from layout.

          // app is not present on ClientConfig
          // reload(config.app.publicUrl);
          window.location.reload();
        } catch (e: any) {
          setError(e);
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <>
      <input
        type='file'
        id='import-keyring-file'
        style={{ display: 'none' }}
        onChange={handleFileChange}
        ref={fileRef}
      />

      <CustomizableDialog
        open={open}
        title='Import keys'
        content={(
          <TextField
            autoFocus
            fullWidth
            label='Passphrase'
            onChange={handlePassChange}
          />
        )}
        error={error}
        actions={(
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant='contained'
              color='primary'
              ref={buttonRef}
              disabled={!passphrase || !!error}
              onClick={async () => {
                assert(fileRef.current);
                (fileRef.current as unknown as HTMLInputElement).click();
              }}
            >
              Choose File
            </Button>
          </>
        )}
      />
    </>
  );
};
