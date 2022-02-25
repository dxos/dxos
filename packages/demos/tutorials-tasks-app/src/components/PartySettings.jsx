//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  styled,
  TextField,
  Typography
} from '@mui/material';

import { useClient, useParty } from '@dxos/react-client';

const Content = styled(DialogContent)(({ theme }) => ({
  paddingTop: `${theme.spacing(1)} !important`
}));

/**
 * Settings dialog.
 * @param {Object} props
 * @param {Buffer} [props.partyKey] Key of party to edit or undefined to create a new one.
 * @param {requestCallback} props.onClose
 *
 * @callback requestCallback
 * @param {Object} params
 * @param {Buffer} params.partyKey
 */
export const PartySettings = ({ partyKey = undefined, onClose }) => {
  const [inProgress, setInprogress] = useState(false);
  const client = useClient();
  const party = useParty(partyKey);
  const [title, setTitle] = useState(party ? party.getProperty('title') : '');

  const handleSubmit = async () => {
    if (!title.length) {
      return;
    }

    try {
      setInprogress(true);
      if (party) {
        // Update the party.
        await party.setProperty('title', title);
      } else {
        // Create a new party.
        // TODO(burdon): Set properties here.
        // ISSUE(rzadp): https://github.com/dxos/echo/issues/312
        const party = await client.echo.createParty({ title });
        await party.setProperty('title', title);
        partyKey = party.key;
      }
    } catch (e) {
      throw e
    } finally {
      setInprogress(false);
    }

    

    onClose({ partyKey });
  };

  return (
    <Dialog open fullWidth maxWidth="xs">
      <DialogTitle>
        <Typography>
          {partyKey ? 'List Settings' : 'Create List'}
        </Typography>
      </DialogTitle>
      <Content>
        <TextField
          fullWidth
          autoFocus
          label="Title"
          value={title}
          onChange={event => setTitle(event.target.value)}
          onKeyPress={event => (event.key === 'Enter') && handleSubmit()}
        />
      </Content>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          disabled={inProgress}
        >
          {partyKey ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
