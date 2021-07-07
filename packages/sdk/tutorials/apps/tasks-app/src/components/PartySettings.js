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
  TextField,
  Typography
} from '@material-ui/core';

import { useClient, useParty } from '@dxos/react-client';

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
const PartySettings = ({ partyKey = undefined, onClose }) => {
  const client = useClient();
  const party = useParty(partyKey);
  const [title, setTitle] = useState(party ? party.getProperty('title') : '');

  const handleUpdate = async () => {
    if (!title.length) {
      return;
    }

    if (party) {
      // Update the party.
      await party.setProperty('title', title);
    } else {
      // Create a new party.
      // TODO(burdon): Why is the type not inferred by Webstorm? - because react-client is not in typescript.
      // ISSUE(rzadp): https://github.com/dxos/sdk/issues/319
      // TODO(burdon): Set properties here.
      // ISSUE(rzadp): https://github.com/dxos/echo/issues/312
      const party = await client.echo.createParty({ title });
      await party.setProperty('title', title);
      partyKey = party.key;
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
      <DialogContent>
        <TextField
          fullWidth
          autoFocus
          label="Title"
          value={title}
          onChange={event => setTitle(event.target.value)}
          onKeyPress={event => (event.key === 'Enter') && handleUpdate()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleUpdate} color="primary">
          {partyKey ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PartySettings;
