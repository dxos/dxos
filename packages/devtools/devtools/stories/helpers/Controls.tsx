//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  AddCircleOutline as AddIcon
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  useTheme
} from '@mui/material';

import { Client, clientServiceBundle } from '@dxos/client';
import { MessengerModel } from '@dxos/messenger-model';
import { ObjectModel } from '@dxos/object-model';
import { useClient, useParties, useProfile } from '@dxos/react-client';
import { RpcPort, createBundledRpcServer } from '@dxos/rpc';
import { TextModel } from '@dxos/text-model';

import { PartyCard } from './PartyCard';

type ModelType = 'ObjectModel' | 'MessengerModel' | 'TextModel'

const modelTypes = {
  'ObjectModel': ObjectModel,
  'MessengerModel': MessengerModel,
  'TextModel': TextModel
};

/**
 * Devtools playground control.
 * @param port
 * @constructor
 */
export const Controls = ({ port }: { port?: RpcPort }) => {
  const [model, setModel] = useState<ModelType>();
  const theme = useTheme();
  const client = useClient();
  const profile = useProfile();
  const parties = useParties();

  useEffect(() => {
    if (port) {
      setImmediate(async () => {
        const rpcServer = createBundledRpcServer({ // TODO(burdon): Rename "Bundled"?
          services: clientServiceBundle,
          handlers: client.services,
          port
        });

        await rpcServer.open();
      });
    }
  }, [port]);

  const handleCreateProfile = () => {
    void client.halo.createProfile();
  };

  const handleCreateParty = () => {
    void client.echo.createParty();
  };

  const handleModelChange = (event: SelectChangeEvent) => {
    setModel(event.target.value as ModelType);
  };

  const handleRegisterModel = (client: Client, modelType: ModelType | undefined) => {
    const modelClass = modelType && modelTypes[modelType];
    if (modelClass) {
      return client.registerModel(modelClass);
    }

    setModel(undefined);
  };

  const handleTestData = async () => {
    client.registerModel(TextModel);
    client.registerModel(MessengerModel);

    const party = await client.echo.createParty();
    const root = await party.database.createItem({ model: ObjectModel, type: 'example:type.root' });
    await root.model.setProperty('name', 'root');

    // Objects.
    await party.database.createItem({ model: ObjectModel, type: 'example:type.object', parent: root.id });
    const child = await party.database.createItem({ model: ObjectModel, type: 'example:type.object', parent: root.id });

    // Test.
    const text = await party.database.createItem({ model: TextModel, type: 'example:type.text', parent: child.id });
    await text.model.insert(0, 'Hello world');

    // Messenger.
    const messenger = await party.database.createItem({ model: MessengerModel, type: 'example:type.messenger', parent: child.id });
    await messenger.model.sendMessage({
      text: 'Hello world',
      sender: 'Test'
    });
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      width: 500,
      overflow: 'hidden',
      // borderLeft: `1px solid ${theme.palette.divider}`,
      backgroundColor: '#EEE'
    }}>
      <Box sx={{
        paddingRight: 1
      }}>
        <Card sx={{ margin: 1 }}>
          <CardActions>
            <Button disabled={!!profile} startIcon={<AddIcon />} onClick={handleCreateProfile}>Profile</Button>
            <Button disabled={!profile} startIcon={<AddIcon />} onClick={handleCreateParty}>Party</Button>
            <Button disabled={!profile} startIcon={<AddIcon />} onClick={handleTestData}>Test Data</Button>
          </CardActions>

          <CardContent>
            <Box sx={{
              display: 'flex',
              alignItems: 'end'
            }}>
              <FormControl fullWidth variant='standard'>
                <InputLabel id='model-select'>Model</InputLabel>
                <Select
                  id='model-select'
                  label='Model'
                  variant='standard'
                  value={model}
                  onChange={handleModelChange}
                >
                  <MenuItem value='ObjectModel'>ObjectModel</MenuItem>
                  <MenuItem value='MessengerModel'>MessengerModel</MenuItem>
                  <MenuItem value='TextModel'>TextModel</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <IconButton size='small' onClick={() => handleRegisterModel(client, model)}>
                  <AddIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
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
