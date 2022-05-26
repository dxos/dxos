//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Avatar,
  createTheme,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import {
  Add as AddIcon,
  Assignment as PartyIcon,
  Redeem as RedeemIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

import { useClient, useParties } from '@dxos/react-client';
import { JoinPartyDialog } from '@dxos/react-toolkit';
import { proto } from '@dxos/client';

import { PartySettings } from './PartySettings';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  grow: {
    flex: 1
  },
  listItem: {
    '& .actions': {
      opacity: 0.2
    },
    '&:hover .actions': {
      opacity: 1
    }
  },
  listItemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  actions: {
    margin: theme.spacing(2),
    '& button': {
      marginRight: theme.spacing(1)
    }
  }
}), { defaultTheme: createTheme({}) });

/**
 * Party list.
 * @param selectedPartyKey
 * @param onSelectParty
 * @param hideRedeem
 */
// TODO(burdon): Remove hideRedeem.
export const PartyList = ({ selectedPartyKey, onSelectParty, hideRedeem = false }) => {
  const client = useClient();
  const classes = useStyles();
  const [partyJoinDialog, setPartyJoinDialog] = useState(false);
  const [{ settingsDialog, settingsPartyKey }, setSettingsDialog] = useState({});
  const parties = useParties();

  // TODO(burdon): Disambiguate party/list (in docs and class names).

  const handleCreateParty = async () => {
    setSettingsDialog({ settingsDialog: true });
  };

  const handleRedeemParty = () => {
    setPartyJoinDialog(true);
  };

  /**
   *
   * @param {FileList} files
   * @returns
   */
  const handlePartyImport = async (files) => {
    if(!files) {
      return;
    }

    const data = new Uint8Array(await files[0].arrayBuffer());

    await client.echo.cloneParty(proto.schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').decode(data));
  }

  // TODO(burdon): Why was party.open renamed party.activate?
  // ISSUE(rzadp): https://github.com/dxos/echo/issues/325

  // TODO(burdon): Standardize dialog open property.

  return (
    <div className={classes.root}>
      {settingsDialog && (
        <PartySettings
          partyKey={settingsPartyKey}
          onClose={({ partyKey }) => {
            setSettingsDialog({});
            if (partyKey) {
              onSelectParty(partyKey);
            }
          }}
        />
      )}

      {partyJoinDialog && (
        <JoinPartyDialog
          open={partyJoinDialog}
          onClose={() => setPartyJoinDialog(false)}
          closeOnSuccess
        // TODO(burdon): Get party key from dialog.
        />
      )}

      <List disablePadding>
        {parties.map(party => (
          <ListItem
            button
            key={party.key}
            selected={selectedPartyKey === party.key}
            onClick={() => onSelectParty(party.key)}
            classes={{ container: classes.listItem }}
          >
            <ListItemAvatar>
              <Avatar>
                <PartyIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={party.getProperty('name')}
              classes={{
                primary: classes.listItemText
              }}
            />
            <ListItemSecondaryAction className='actions'>
              <IconButton
                size='small'
                edge='end'
                aria-label='settings'
                title='Settings'
                onClick={() => setSettingsDialog({ settingsDialog: true, settingsPartyKey: party.key })}
              >
                <SettingsIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <div className={classes.grow} />
      <div>
        <input type='file' onChange={e => handlePartyImport(e.currentTarget.files)} />
      </div>
      <div className={classes.actions}>
        <Fab
          size='small'
          color='primary'
          aria-label='add'
          title='Create list'
          onClick={handleCreateParty}
        >
          <AddIcon />
        </Fab>
        {!hideRedeem && (
          <Fab
            size='small'
            color='secondary'
            aria-label='redeem'
            title='Redeem invitation'
            onClick={handleRedeemParty}
          >
            <RedeemIcon />
          </Fab>
        )}
      </div>
    </div>
  );
};
