//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

// https://mui.com/components/material-icons
import {
  FilterTiltShift as SwarmIcon,
  GroupWork as PartiesIcon,
  AccountTree as ItemsIcon,
  Dns as StorageIcon,
  Router as SignalIcon,
  Settings as ConfigIcon,
  Subject as LoggingIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';
import {
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  colors,
  createTheme
} from '@mui/material';
import { makeStyles } from '@mui/styles';

import { MessengerModel } from '@dxos/messenger-model';
import { useClient } from '@dxos/react-client';
import { TextModel } from '@dxos/text-model';

import {
  ConfigView,
  ItemsViewer,
  LoggingView,
  Keyring,
  PartiesViewer,
  Signal,
  StorageTab,
  SwarmDetails
  // SwarmGraph
} from './containers';

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
    width: 120,
    backgroundColor: colors.grey[100],
    borderRight: `1px solid ${theme.palette.divider}`
  },
  content: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    overflowX: 'hidden',
    overflowY: 'auto'
  },
  contentHidden: {
    display: 'none'
  }
}), { defaultTheme: createTheme({}) });

const items = [
  {
    title: 'CLIENT',
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
        id: 'echo.parties',
        title: 'Parties',
        icon: PartiesIcon
      },
      {
        id: 'echo.items',
        title: 'Items',
        icon: ItemsIcon
      }
    ]
  },
  {
    title: 'MESH',
    items: [
      /*
      {
        id: 'mesh.swarmgraph',
        title: 'Swarm Graph',
        icon: SwarmIcon
      },
      */
      {
        id: 'mesh.swarminfo',
        title: 'Swarm',
        icon: SwarmIcon
      },
      {
        id: 'mesh.signal',
        title: 'Signal',
        icon: SignalIcon
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

export const App = () => {
  const client = useClient();
  useEffect(() => {
    client.registerModel(TextModel);
    client.registerModel(MessengerModel);
  }, [client]);

  const classes = useStyles();
  const [selected, setSelected] = useState(items[0].items[0].id);

  const handleListItemClick = (event: any, index: string) => {
    setSelected(index);
  };

  const className = (id: string) => selected === id ? classes.content : classes.contentHidden;

  return (
    <div className={classes.root}>
      <div className={classes.sidebar}>
        <List dense disablePadding>
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
                  <ListItemIcon sx={{
                    '&.MuiListItemIcon-root': {
                      minWidth: 36
                    }
                  }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText
                    style={{ whiteSpace: 'nowrap' }}
                    primary={title}
                  />
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
        <Keyring />
      </div>
      <div className={className('echo.parties')}>
        <PartiesViewer />
      </div>
      <div className={className('echo.items')}>
        <ItemsViewer />
      </div>
      <div className={className('mesh.signal')}>
        <Signal />
      </div>
      {/*
      <div className={className('mesh.swarmgraph')}>
        <SwarmGraph />
      </div>
      */}
      <div className={className('mesh.swarminfo')}>
        <SwarmDetails />
      </div>
      <div className={className('debug.logging')}>
        <LoggingView />
      </div>
    </div>
  );
};
