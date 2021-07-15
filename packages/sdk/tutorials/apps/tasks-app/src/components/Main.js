//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { AppBar, Drawer, IconButton, Toolbar, Typography, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  AccountCircle as AccountIcon,
  DeleteForever as ResetIcon,
  Work as WorkIcon
} from '@material-ui/icons';

import { useClient, useProfile } from '@dxos/react-client';

import PartyList from './PartyList';
import TaskList from './TaskList';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex'
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1
  },
  logo: {
    marginRight: theme.spacing(2)
  },
  toolbarShift: theme.mixins.toolbar,
  flexGrow: {
    flex: 1
  },
  drawer: {
    flexShrink: 0,
    width: theme.sidebar.width
  },
  drawerPaper: {
    width: theme.sidebar.width,
    overflow: 'auto'
  },
  main: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  }
}));

/**
 * Main layout.
 */
const Main = () => {
  const classes = useStyles();
  const client = useClient();
  const profile = useProfile();
  const [partyKey, setPartyKey] = useState();

  const handleResetStorage = async () => {
    const reset = confirm('Are you sure you want to reset storage?');
    if (reset) {
      await client.reset();
      window.location.reload();
    }
  };

  return (
    <div className={classes.root}>
      <AppBar
        position="fixed"
        className={classes.appBar}
      >
        <Toolbar>
          <WorkIcon className={classes.logo} />
          <Typography variant="h6" noWrap>
            {client.config.app.title || 'DXOS'}
          </Typography>
          <div className={classes.flexGrow} />
          <Tooltip title={profile.username}>
            <IconButton color='inherit'>
              <AccountIcon className='account-icon' />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Storage">
            <IconButton color='inherit' onClick={handleResetStorage}>
              <ResetIcon className='reset-icon' />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        className={classes.drawer}
        classes={{
          paper: classes.drawerPaper
        }}
      >
        <div className={classes.toolbarShift} />
        <PartyList
          selectedPartyKey={partyKey}
          onSelectParty={partyKey => setPartyKey(partyKey)}
        />
      </Drawer>

      <main className={classes.main}>
        {partyKey && (
          <>
            <div className={classes.toolbarShift} />
            <TaskList partyKey={partyKey} />
          </>
        )}
      </main>
    </div>
  );
};

export default Main;
