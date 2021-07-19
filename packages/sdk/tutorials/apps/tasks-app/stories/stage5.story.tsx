//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Drawer } from '@material-ui/core';
import { createMuiTheme, makeStyles } from '@material-ui/core/styles';
import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import { ReactUXTheme } from '@dxos/react-ux';
import ProfileDialog from '../src/components/ProfileDialog';
import PartyList from '../src/components/PartyList';
import TaskList from '../src/components/TaskList';

/**
 * Create the user's HALO profile, then create shareable parties with items.
 */
export const Stage5 = () => {
  const baseTheme = createMuiTheme({});

  const useStyles = makeStyles(() => ({
    root: {
      display: 'flex'
    },
    drawer: {
      flexShrink: 0,
      width: 300
    },
    drawerPaper: {
      width: 300,
      overflow: 'auto'
    },
    main: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }
  }));

  const App = () => {
    const classes = useStyles();
    const client = useClient();
    const profile = useProfile();
    const [partyKey, setPartyKey] = useState<Buffer | undefined>();

    const handleCreateProfile = async ({ username }: { username: string }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        await client.halo.createProfile({ publicKey, secretKey, username });
      }
    };

    if (!profile) {
      return (
        <ProfileDialog open={!profile} onClose={handleCreateProfile} />
      );
    }

    return (
      <div className={classes.root}>
        <Drawer
          variant="permanent"
          className={classes.drawer}
          classes={{
            paper: classes.drawerPaper
          }}
        >
          <PartyList
            selectedPartyKey={partyKey}
            onSelectParty={(partyKey: Buffer) => setPartyKey(partyKey)}
          />
        </Drawer>

        <main className={classes.main}>
          {partyKey && <TaskList partyKey={partyKey} />}
        </main>
      </div>
    );
  };

  return (
    <ClientInitializer>
      <ReactUXTheme base={baseTheme}>
        <App />
      </ReactUXTheme>
    </ClientInitializer>
  );
};

export default {
  title: 'Tasks App/Stage 5',
  component: Stage5
};
