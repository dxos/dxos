//
// Copyright 2020 DXOS.org
//

import AccountTreeIcon from '@mui/icons-material/AccountTree';
import StorageIcon from '@mui/icons-material/Dns';
import SwarmIcon from '@mui/icons-material/Router';
import ConfigIcon from '@mui/icons-material/Settings';
import LoggingIcon from '@mui/icons-material/Subject';
import KeyIcon from '@mui/icons-material/VpnKey';
import { createTheme } from '@mui/material';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import * as colors from '@mui/material/colors';
import { makeStyles } from '@mui/styles';
import React, { useState } from 'react';

import { ConfigView } from './containers/ConfigView';
import { DebugLoggingView } from './containers/DebugLoggingView';
import ItemsViewer from './containers/ItemsViewer';
import Keys from './containers/Keys';
import Signal from './containers/Signal';
import StorageTab from './containers/StorageTab';
import SwarmDetails from './containers/SwarmDetails';
import SwarmGraph from './containers/SwarmGraph';

// TODO(wittjosiah): Refactor, makeStyles is deprecated.
const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    height: '100vh'
  },
  sidebar: {
    flexShrink: 0,
    width: 140,
    backgroundColor: colors.grey[100],
    borderRight: `1px solid ${theme.palette.divider}`
  },
  icon: {
    minWidth: 28
  },
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  contentHidden: {
    display: 'none'
  }
}), { defaultTheme: createTheme({}) });

const items = [
  {
    title: 'Application',
    items: [
      {
        id: 'config',
        title: 'Config',
        icon: ConfigIcon
      },
      {
        id: 'storage',
        title: 'Storage',
        icon: StorageIcon
      }
    ]
  },
  {
    title: 'HALO',
    items: [
      {
        id: 'halo.keyring',
        title: 'Keyring',
        icon: KeyIcon
      }
    ]
  },
  {
    title: 'ECHO',
    items: [
      {
        id: 'echo.items',
        title: 'Items',
        icon: AccountTreeIcon
      }
    ]
  },
  {
    title: 'MESH',
    items: [
      {
        id: 'mesh.swarmgraph',
        title: 'Swarm Graph',
        icon: SwarmIcon
      },
      {
        id: 'mesh.swarminfo',
        title: 'Swarm Info',
        icon: SwarmIcon
      },
      {
        id: 'mesh.signal',
        title: 'Signal',
        icon: SwarmIcon
      }
    ]
  },
  {
    title: 'DEBUG',
    items: [
      {
        id: 'debug.logging',
        title: 'Logging',
        icon: LoggingIcon
      }
    ]
  }
];

const App = () => {
  const classes = useStyles();
  const [selected, setSelected] = useState(items[0].items[0].id);

  const handleListItemClick = (event: any, index: string) => {
    setSelected(index);
  };

  const className = (id: string) => selected === id ? classes.content : classes.contentHidden;

  return (
    <div className={classes.root}>
      <div className={classes.sidebar}>
        <List dense aria-label="main tools">
          {items.map(({ title, items = [] }) => (
            <div key={title}>
              <ListItem>
                <ListItemText primary={title} />
              </ListItem>
              {items.map(({ id, title, icon: Icon }) => (
                <ListItem
                  key={id}
                  button
                  selected={selected === id}
                  onClick={(event) => handleListItemClick(event, id)}
                >
                  <ListItemIcon classes={{ root: classes.icon }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={title} />
                </ListItem>
              ))}
              <Divider />
            </div>
          ))}
        </List>
      </div>

      {/* Display hidden so that components maintain state. */}

      <div className={className('config')}>
        <ConfigView />
      </div>
      <div className={className('storage')}>
        <StorageTab />
      </div>
      <div className={className('halo.keyring')}>
        <Keys />
      </div>
      <div className={className('echo.items')}>
        <ItemsViewer />
      </div>
      <div className={className('mesh.signal')}>
        <Signal />
      </div>
      <div className={className('mesh.swarmgraph')}>
        <SwarmGraph />
      </div>
      <div className={className('mesh.swarminfo')}>
        <SwarmDetails />
      </div>
      <div className={className('debug.logging')}>
        <DebugLoggingView />
      </div>
    </div>
  );
};

export default App;
