//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  AddCircleOutline as AddIcon,
  MoreVert as MenuIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';

import { clientServiceBundle } from '@dxos/client';
import { MessengerModel } from '@dxos/messenger-model';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient, useParties, useProfile } from '@dxos/react-client';
import { JoinPartyDialog } from '@dxos/react-toolkit';
import { RpcPort, createBundledRpcServer } from '@dxos/rpc';
import { TextModel } from '@dxos/text-model';

import { PartyCard } from './PartyCard';

/**
 * Devtools playground control.
 * @param port
 * @constructor
 */
export const PlaygroundControls = ({ port }: { port?: RpcPort }) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [showJoinParty, setShowJoinParty] = useState(false);
  const client = useClient();
  const profile = useProfile();
  const parties = useParties();

  useAsyncEffect(async () => {
    if (port) {
      const rpcServer = createBundledRpcServer({ // TODO(burdon): Rename "Bundled"?
        services: clientServiceBundle,
        handlers: client.services,
        port
      });

      await rpcServer.open();
    }
  }, [port]);

  const handleCreateProfile = () => {
    void client.halo.createProfile();
  };

  const handleCreateParty = () => {
    void client.echo.createParty();
  };

  const handleTestData = async () => {
    client.echo.registerModel(TextModel);
    client.echo.registerModel(MessengerModel);

    // Create party.
    const party = await client.echo.createParty();
    const root = await party.database.createItem({
      model: ObjectModel, type: 'example:type/root'
    });
    await root.model.set('title', 'root');

    // Objects.
    await party.database.createItem({
      model: ObjectModel, type: 'example:type/object', parent: root.id
    });
    const child = await party.database.createItem({
      model: ObjectModel, type: 'example:type/object', parent: root.id
    });

    // Text.
    const text = await party.database.createItem({
      model: TextModel, type: 'example:type/text', parent: child.id
    });
    await text.model.insert('Hello world', 0);

    // Messenger.
    const messenger = await party.database.createItem({
      model: MessengerModel, type: 'example:type/messenger', parent: child.id
    });
    await messenger.model.sendMessage({
      text: 'Hello world',
      sender: 'Tester' // TODO(burdon): Key not name?
    });
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      width: 420,
      overflow: 'hidden',
      backgroundColor: '#EEE'
    }}>
      <>
        <Menu
          open={Boolean(menuAnchorEl)}
          anchorEl={menuAnchorEl}
          onClose={() => setMenuAnchorEl(null)}
        >
          <MenuItem
            disabled={!profile}
            onClick={() => {
              setMenuAnchorEl(null);
              void handleTestData();
            }}
          >
            Generate Test Data
          </MenuItem>
          <MenuItem
            disabled={!profile}
            onClick={() => {
              setMenuAnchorEl(null);
              setShowJoinParty(true);
            }}
          >
            Join Party
          </MenuItem>
        </Menu>

        <JoinPartyDialog
          open={showJoinParty}
          onClose={() => setShowJoinParty(false)}
          closeOnSuccess
        />
      </>

      <Box sx={{
        paddingRight: 1
      }}>
        <Card sx={{ margin: 1 }}>
          <CardActions>
            <Button disabled={!!profile} startIcon={<AddIcon />} onClick={handleCreateProfile} variant='outlined'>
              Profile
            </Button>
            <Button disabled={!profile} startIcon={<AddIcon />} onClick={handleCreateParty}>
              Party
            </Button>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={event => setMenuAnchorEl(event.currentTarget)}>
              <MenuIcon />
            </IconButton>
          </CardActions>
        </Card>
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'scroll',
        paddingRight: 1
      }}>
        <Box>
          {parties.map(party => <PartyCard key={party.key.toHex()} party={party} />)}
        </Box>
      </Box>
    </Box>
  );
};
