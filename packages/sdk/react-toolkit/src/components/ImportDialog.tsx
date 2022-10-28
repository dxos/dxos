//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import React, { SyntheticEvent, useState, useRef } from 'react';

import { Button, TextField } from '@mui/material';

import { Dialog } from '@dxos/react-components';

/**
 * Dialog to import keyring from file.
 */
export const ImportDialog = ({
  open,
  onClose,
  decrypter
}: {
  open: boolean;
  onClose: (text?: string) => void;
  decrypter: (text: string, passphrase: string) => Promise<string>;
}) => {
  const buttonRef = useRef(null);
  const fileRef = useRef(null);
  const [passphrase, setPassphrase] = useState<string>();
  const [error, setError] = useState<string>();
  const minLength = 8;

  const handlePassChange = (event: SyntheticEvent) => {
    setPassphrase((event.target as HTMLTextAreaElement).value);
  };

  const handleFileChange = (event: SyntheticEvent) => {
    assert(event.target);
    const input = event.target as HTMLInputElement;
    const file = input.files![0];

    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const loaded = (event.target as FileReader).result as string;
          const value = await decrypter(loaded, passphrase!);
          onClose(value);
        } catch (err: any) {
          setError(String(err));
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

      <Dialog
        open={open}
        title='Import keys'
        error={error}
        content={<TextField sx={{ marginTop: 1 }} autoFocus fullWidth label='Passphrase' onChange={handlePassChange} />}
        actions={
          <>
            <Button onClick={() => onClose()}>Cancel</Button>
            <Button
              variant='contained'
              color='primary'
              ref={buttonRef}
              disabled={!!error || !passphrase || passphrase.length < minLength}
              onClick={async () => {
                assert(fileRef.current);
                (fileRef.current as unknown as HTMLInputElement).click();
              }}
            >
              Choose File
            </Button>
          </>
        }
      />
    </>
  );
};
