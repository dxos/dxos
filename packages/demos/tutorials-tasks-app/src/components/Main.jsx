//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  AppBar,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  createTheme
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import {
  AccountCircle as AccountIcon,
  DeleteForever as ResetIcon,
  Devices as DevicesIcon,
  Work as WorkIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

import { useClient, useProfile } from '@dxos/react-client';
import { HaloSharingDialog } from '@dxos/react-framework';

import { PartyList } from './PartyList';
import { TaskList } from './TaskList';

// TODO(wittjosiah): Migrate to Mui5.
const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex'
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
}), { defaultTheme: createTheme({}) });

/**
 * Main layout.
 */
export const Main = () => {
  const classes = useStyles();
  const client = useClient();
  const profile = useProfile();
  const [haloInviteOpen, setHaloInviteOpen] = useState(false);
  const [partyKey, setPartyKey] = useState();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleButtonClick = (event) => {
    setAnchorEl(event.currentTarget);
    setProfileMenuOpen(true);
  };
  const handleResetStorage = async () => {
    const reset = window.confirm('Are you sure you want to reset storage?');
    if (reset) {
      await client.reset();
      window.location.reload();
    }
  };
  const handleInviteDevice = () => {
    setHaloInviteOpen(true);
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
            {client.config.get('runtime.props.title', 'DXOS')}
          </Typography>
          <div className={classes.flexGrow} />
          <Tooltip title={profile.username}>
            <IconButton color='inherit'>
              <AccountIcon className='account-icon' />
            </IconButton>
          </Tooltip>
          <IconButton title="More Options" variant="contained" color="inherit" onClick={handleButtonClick}>
            <MoreVertIcon></MoreVertIcon>
          </IconButton>
          <Popover
            open={profileMenuOpen}
            anchorEl={anchorEl}
            onClose={() => {
              setProfileMenuOpen(false);
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
          >
            <List dense>
              <ListItem component="button" button onClick={handleResetStorage} title="Reset Storage Button">
                <ListItemIcon>
                  <ResetIcon className='reset-icon' />
                </ListItemIcon>
                <ListItemText primary="Reset Storage"></ListItemText>
              </ListItem>
              <ListItem component="button" button onClick={handleInviteDevice} title="Invite Device Button">
                <ListItemIcon>
                  <DevicesIcon className='devices-icon' />
                </ListItemIcon>
                <ListItemText primary="Invite Device"></ListItemText>
              </ListItem>
            </List>
          </Popover>
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

      <HaloSharingDialog
        open={haloInviteOpen}
        onClose={() => setHaloInviteOpen(false)}
      />
    </div>
  );
};
