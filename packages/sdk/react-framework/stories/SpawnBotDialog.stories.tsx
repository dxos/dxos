//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Box, Button, TextField, Toolbar } from '@mui/material';

import { Party, Item } from '@dxos/client';
import type { ConfigObject } from '@dxos/config';
import { ObjectModel } from '@dxos/object-model';
import {
  ClientProvider,
  ProfileInitializer,
  useClient,
  useSelection
} from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { RegistryProvider } from '@dxos/react-registry-client';

import { ErrorBoundary, SpawnBotDialog } from '../src';
import { createMockRegistryWithBots } from '../src/testing';
import { Column } from './helpers';

export default {
  title: 'react-framework/SpawnBotDialog'
};

const TEST_TYPE = 'TEST_TYPE';

const clientConfig: ConfigObject = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'ws://localhost:4000'
      },
      bot: {
        topic: 'd5943248a8b8390bc0c08d9fc5fc447a3fff88abb0474c9fd647672fc8b03edb'
      }
    }
  }
};

const User = () => {
  const [open, setOpen] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [party, setParty] = useState<Party>();
  const [testText, setTestText] = useState('');
  const [textItem, setTextItem] = useState<Item<ObjectModel>>();
  const client = useClient();
  const counterItems = useSelection(party?.select({ type: 'DXOS_COUNTER' }));

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
  const mockRegistry = useMemo(createMockRegistryWithBots, []);

  return (
    <FullScreen>
      <ErrorBoundary>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientProvider config={clientConfig}>
            <RegistryProvider registry={mockRegistry}>
              <ProfileInitializer>
                <Column>
                  <User />
                </Column>
              </ProfileInitializer>
            </RegistryProvider>
          </ClientProvider>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
