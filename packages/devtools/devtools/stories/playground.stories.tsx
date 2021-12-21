//
// Copyright 2021 DXOS.org
//

import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';

import {
  Box,
  Button,
  CssBaseline,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  ThemeProvider,
  Typography,
  useTheme
} from '@mui/material';

import { PartyProxy, clientServiceBundle } from '@dxos/client';
import { truncateString } from '@dxos/debug';
import { MessengerModel } from '@dxos/messenger-model';
import { ObjectModel } from '@dxos/object-model';
import { ClientProvider, useClient, useParties, useProfile } from '@dxos/react-client';
import { RpcPort, createLinkedPorts, createBundledRpcServer } from '@dxos/rpc';
import { TextModel } from '@dxos/text-model';

import { App, ErrorBoundary } from '../src';

export default {
  title: 'devtools/Playground'
};

const DevTools = ({ port }: { port: RpcPort }) => {
  const theme = useTheme();

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ClientProvider
          config={{
            system: {
              remote: true
            }
          }}
          options={{
            rpcPort: port
          }}
        >
          <App />
        </ClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

const PartyControls = ({ party }: { party: PartyProxy }) => {
  const [title, setTitle] = useState('');
  const [propertyKey, setPropertyKey] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [itemModel, setItemModel] = useState('');

  const handlePartyOpenToggle = (party: PartyProxy) => {
    void (party.isOpen ? party.close() : party.open());
  };

  const handlePartyActiveToggle = (party: PartyProxy) => {
    const options = { global: true };
    void (party.isActive ? party.deactivate(options) : party.activate(options));
  };

  const handlePartyTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSetPartyTitle = (party: PartyProxy) => {
    void party.setTitle(title);
  };

  const handlePropertyKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyKey(event.target.value);
  };

  const handlePropertyValueChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPropertyValue(event.target.value);
  };

  const handleSetPartyProperty = (party: PartyProxy) => {
    void party.setProperty(propertyKey, propertyValue);
  };

  const handleItemModelChange = (event: SelectChangeEvent) => {
    setItemModel(event.target.value as string);
  };

  const handleCreateItem = (party: PartyProxy) => {
    switch (itemModel) {
      case 'ObjectModel':
        void party.database.createItem({
          model: ObjectModel,
          type: 'example:type.object'
        });
        break;
      case 'MessengerModel':
        void party.database.createItem({
          model: MessengerModel,
          type: 'example:type.messenger'
        });
        break;
      case 'TextModel':
        void party.database.createItem({
          model: TextModel,
          type: 'example:type.text'
        });
    }
  };

  return (
    <Box key={party.key.toString()}>
      <Typography>Party({truncateString(party.key.toString(), 8)})</Typography>
      <Box padding={2}>
        <Box marginBottom={1}>
          <Button onClick={() => handlePartyOpenToggle(party)}>
            {party.isOpen ? 'Close' : 'Open'} Party
          </Button>
          <Button onClick={() => handlePartyActiveToggle(party)}>
            {party.isActive ? 'Deactivate' : 'Activate'} Party
          </Button>
        </Box>
        <TextField
          label='Title'
          variant='standard'
          fullWidth
          value={title}
          onChange={handlePartyTitleChange}
        />
        <Box
          display='flex'
          justifyContent='flex-end'
        >
          <Button onClick={() => handleSetPartyTitle(party)}>Set Title</Button>
        </Box>
        <TextField
          label='Property Key'
          variant='standard'
          fullWidth
          sx={{ marginBottom: 1 }}
          value={propertyKey}
          onChange={handlePropertyKeyChange}
        />
        <TextField
          label='Property Value'
          variant='standard'
          fullWidth
          value={propertyValue}
          onChange={handlePropertyValueChange}
        />
        <Box
          display='flex'
          justifyContent='flex-end'
        >
          <Button onClick={() => handleSetPartyProperty(party)}>Set Property</Button>
        </Box>
        {/* TODO(wittjosiah): Why is there padding inside these selects? */}
        <FormControl fullWidth>
          <InputLabel id='model-select'>Model</InputLabel>
          <Select
            label='Item Model'
            variant='standard'
            value={itemModel}
            onChange={handleItemModelChange}
          >
            <MenuItem value='ObjectModel'>ObjectModel</MenuItem>
            <MenuItem value='MessengerModel'>MessengerModel</MenuItem>
            <MenuItem value='TextModel'>TextModel</MenuItem>
          </Select>
        </FormControl>
        <Box
          display='flex'
          justifyContent='flex-end'
        >
          <Button onClick={() => handleCreateItem(party)}>Create Item</Button>
        </Box>
      </Box>
    </Box>
  );
};

const Controls = ({ port }: { port: RpcPort }) => {
  const client = useClient();
  const profile = useProfile();
  const parties = useParties();
  const [model, setModel] = useState('');

  useEffect(() => {
    setImmediate(async () => {
      const rpcServer = createBundledRpcServer({
        services: clientServiceBundle,
        handlers: client.services,
        port
      });

      await rpcServer.open();
    });
  }, []);

  const handleCreateProfile = () => {
    void client.halo.createProfile();
  };

  const handleCreateParty = () => {
    void client.echo.createParty();
  };

  const handleModelChange = (event: SelectChangeEvent) => {
    setModel(event.target.value as string);
  };

  const handleRegisterModel = () => {
    switch (model) {
      case 'ObjectModel':
        void client.registerModel(ObjectModel);
        break;
      case 'MessengerModel':
        void client.registerModel(MessengerModel);
        break;
      case 'TextModel':
        void client.registerModel(TextModel);
    }

    setModel('');
  };

  async function handleTestSetup () {
    client.registerModel(TextModel);
    client.registerModel(MessengerModel);
    const party = await client.echo.createParty();
    const root = await party.database.createItem({ model: ObjectModel, type: 'example:type.root' });
    await root.model.setProperty('name', 'root');
    await party.database.createItem({ model: ObjectModel, type: 'example:type.object', parent: root.id });
    const child = await party.database.createItem({ model: ObjectModel, type: 'example:type.object', parent: root.id });
    const text = await party.database.createItem({ model: TextModel, type: 'example:type.text', parent: child.id });
    await text.model.insert(0, 'Hello world');
    const messenger = await party.database.createItem({ model: MessengerModel, type: 'example:type.messenger', parent: child.id });
    await messenger.model.sendMessage({
      text: 'Hello world',
      sender: 'Test'
    });
  }

  return (
    <Box sx={{
      width: 500,
      padding: 2,
      borderLeft: '1px solid',
      borderLeftColor: 'primary.main'
    }}>
      <Button disabled={!profile} onClick={handleTestSetup}>Create Test data</Button>
      {!profile && <Button onClick={handleCreateProfile}>Create Profile</Button>}
      {profile && <Button onClick={handleCreateParty}>Create Party</Button>}
      <Box padding={2}>
        <FormControl
          fullWidth
          variant='standard'
        >
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
        <Box
          display='flex'
          justifyContent='flex-end'
        >
          <Button onClick={handleRegisterModel}>Register Model</Button>
        </Box>
      </Box>
      <Box>
        {parties.map(party => <PartyControls key={party.key.toHex()} party={party} />)}
      </Box>
    </Box>
  );
};

export const Primary = () => {
  const [controlsPort, devtoolsPort] = useMemo(() => createLinkedPorts(), []);

  return (
    <Box display='flex'>
      <DevTools port={devtoolsPort} />
      <ClientProvider
        config={
          {
            services: {
              signal: {
                // TODO(burdon): Move to config (overdependent on enterprise).
                server: 'wss://enterprise.kube.dxos.network/dxos/signal'
              }
            }
          }
        }
      >
        <Controls port={controlsPort} />
      </ClientProvider>
    </Box>
  );
};
