//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { AppBar, Drawer, Toolbar, Typography, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { AccountCircle as AccountIcon } from '@material-ui/icons';
import WorkIcon from '@material-ui/icons/Work';

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
  const { config } = useClient();
  const profile = useProfile();
  const [partyKey, setPartyKey] = useState();

  return (
    <div className={classes.root}>
      <AppBar
        position="fixed"
        className={classes.appBar}
      >
        <Toolbar>
          <WorkIcon className={classes.logo} />
          <Typography variant="h6" noWrap>
            {config.app.title || 'DXOS'}
          </Typography>
          <div className={classes.flexGrow} />
          <Tooltip title={profile.username}>
            <AccountIcon className='account-icon' />
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
