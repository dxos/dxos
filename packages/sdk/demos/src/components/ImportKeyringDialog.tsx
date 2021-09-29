//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import React, { useState, useRef } from 'react';

import { DialogContentText } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  marginTop: {
    marginTop: theme.spacing(2)
  }
}));

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
