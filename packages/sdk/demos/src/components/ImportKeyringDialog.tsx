//
// Copyright 2020 DXOS.org
//

import { createTheme, DialogContentText } from '@mui/material';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';
import assert from 'assert';
import React, { useState, useRef } from 'react';

const useStyles = makeStyles(theme => ({
  marginTop: {
    marginTop: theme.spacing(2)
  }
}), { defaultTheme: createTheme({}) });

/**
 * Dialog to import keyring from file.
 */
const ImportKeyringDialog = ({
  onClose,
  decrypter
}: {
  onClose: () => void,
  decrypter: (
    text: string | ArrayBuffer | null,
    passphrase: number
  ) => string
}) => {
  const classes = useStyles();
  // const config = useConfig();
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
        } catch (e) {
          setError(e);
        }
      };

      reader.readAsText(file);
    }
  };

  return (
    <>
      <input
        type="file"
        id="import-keyring-file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        ref={fileRef}
      />

      <DialogTitle>Import Keys</DialogTitle>

      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Passphrase"
          onChange={handlePassChange}
        />
        {!!error && (
          <DialogContentText className={classes.marginTop}>Something went wrong. Please try again later.</DialogContentText>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="primary"
          ref={buttonRef}
          disabled={!passphrase || !!error}
          onClick={async () => {
            assert(fileRef.current);
            (fileRef.current as unknown as HTMLInputElement).click();
          }}
        >
          Choose File
        </Button>
      </DialogActions>
    </>
  );
};

export default ImportKeyringDialog;
