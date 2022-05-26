//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';
import { Drawer } from '@mui/material';
import { makeStyles } from '@mui/styles';

import { ClientProvider, useClient, useProfile } from '@dxos/react-client';
import { ProfileDialog } from '@dxos/react-toolkit';

import { PartyList, TaskList } from '../src';

/**
 * Create the user's HALO profile, then create parties with items.
 */
export const Stage4 = () => {
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
        await client.halo.createProfile({ username });
      }
    };

    if (!profile) {
      return (
        <ProfileDialog open={!profile} onCreate={handleCreateProfile} />
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
            hideRedeem={true}
          />
        </Drawer>

        <main className={classes.main}>
          {partyKey && <TaskList partyKey={partyKey} hideShare={true} />}
        </main>
      </div>
    );
  };

  return (
    <ClientProvider>
      <App />
    </ClientProvider>
  );
};

export default {
  title: 'tasks-app/Stage 4',
  component: Stage4
};
