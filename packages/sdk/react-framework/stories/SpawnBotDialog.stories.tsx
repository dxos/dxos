//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box, Button, TextField, Toolbar } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import type { defs } from '@dxos/config';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import {
  ClientProvider,
  ProfileInitializer,
  useClient,
  useSelection
} from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import {
  ErrorBoundary,
  FrameworkContextProvider,
  SpawnBotDialog
} from '../src';
import { Column } from './helpers';

export default {
  title: 'react-framework/SpawnBotDialog'
};

const TEST_TYPE = 'TEST_TYPE';

const clientConfig: defs.Config = {
  services: {
    signal: {
      server: 'ws://localhost:4000'
    },
    bot: {
      topic: 'e61469c04e4265e145f9863dd4b84fd6dee8f31e10160c38f9bb3c289e3c09bc'
    }
  }
};

const User = () => {
  const [open, setOpen] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [party, setParty] = useState<PartyProxy>();
  const [testText, setTestText] = useState('');
  const [textItem, setTextItem] = useState<Item<ObjectModel>>();
  const client = useClient();
  const counterItems = useSelection(party?.database.select(s => s
    .filter({ type: 'DXOS_COUNTER' })
    .items)
  , [party?.key]);

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    setParty(party);
  };

  useEffect(() => {
    void handleCreateParty();
  }, []);

  useEffect(() => {
    setImmediate(async () => {
      const textItem = await party?.database.createItem({
        type: TEST_TYPE,
        model: ObjectModel,
        props: {
          text: testText
        }
      });
      setTextItem(textItem);
    });
  }, [party]);

  useEffect(() => {
    if (textItem) {
      void textItem.model.setProperty('text', testText);
    }
  }, [testText]);

  if (!party) {
    return null;
  }

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Spawn bot</Button>
      </Toolbar>
      {open && (
        <SpawnBotDialog
          party={party}
          open={open}
          onClose={() => setOpen(false)}
          onBotCreated={() => setBotRunning(true)}
        />
      )}
      <Box sx={{ marginTop: 2, padding: 1 }}>
        Bot running: {botRunning ? 'yes' : 'no'}
      </Box>
      <Box sx={{ marginTop: 2, padding: 1 }}>
        Number of occurences of word &quot;DXOS&quot; in below text: {(counterItems?.length && counterItems[0].model.getProperty('counter')) ?? 0}
      </Box>
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <TextField
          fullWidth
          placeholder='Type in some text with word DXOS...'
          multiline
          rows={5}
          spellCheck={false}
          value={testText}
          onChange={(event) => setTestText(event.target.value)}
        />
      </Box>
    </Box>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <ErrorBoundary>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientProvider config={clientConfig}>
            <ProfileInitializer>
              <FrameworkContextProvider>
                <Column>
                  <User />
                </Column>
              </FrameworkContextProvider>
            </ProfileInitializer>
          </ClientProvider>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
