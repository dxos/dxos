//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Drawer } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { createKeyPair } from '@dxos/crypto';
import { ClientInitializer, useClient, useProfile } from '@dxos/react-client';
import ProfileDialog from '../src/components/ProfileDialog';
import PartyList from '../src/components/PartyList';
import TaskList from '../src/components/TaskList';

/**
 * Create the user's HALO profile, then create parties with items.
 */
export const Stage3 = () => {
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
    const [partyKey, setPartyKey] = useState();

    const handleCreateProfile = async ({ username }) => {
      if (username) {
        const { publicKey, secretKey } = createKeyPair();
        await client.createProfile({ publicKey, secretKey, username });
      }
    };

    if (!profile) {
      return (
        <ProfileDialog open={!profile} onClose={handleCreateProfile} />
      )
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
            onSelectParty={partyKey => setPartyKey(partyKey)}
            hideRedeem={true}
          />
        </Drawer>

        <main className={classes.main}>
          {partyKey && (
            <>
              <TaskList partyKey={partyKey} hideShare={true} />
            </>
          )}
        </main>
      </div>
    );
  };

  return (
    <ClientInitializer>
      <App />
    </ClientInitializer>
  );
};

export default {
  title: 'Tutorials/Stage 3',
  component: Stage3
};
