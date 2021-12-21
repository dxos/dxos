//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

// https://mui.com/components/material-icons
import {
  AccountTree as ItemsIcon,
  List as FeedsIcon,
  Dns as StorageIcon,
  FactCheck as CredentialMessagesIcon,
  FilterTiltShift as SwarmIcon,
  GroupWork as PartiesIcon,
  List as FeedsIcon,
  Router as SignalIcon,
  Settings as ConfigIcon,
  Subject as LoggingIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';
import {
  Box,
  BoxProps,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  colors,
  styled
} from '@mui/material';

import { MessengerModel } from '@dxos/messenger-model';
import { useClient } from '@dxos/react-client';
import { TextModel } from '@dxos/text-model';

import {
  ConfigView,
  CredentialMessagesViewer,
  FeedsViewer,
  ItemsViewer,
  LoggingView,
  Keyring,
  PartiesViewer,
  Signal,
  StorageTab,
  SwarmDetails
  // SwarmGraph
} from './containers';

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
      },
      {
        id: 'halo.credentialMessages',
        title: 'Messages',
        icon: CredentialMessagesIcon
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
      },
      {
        id: 'echo.feeds',
        title: 'Feeds',
        icon: FeedsIcon
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

interface ContentBoxProps extends BoxProps {
  selected?: boolean
}

const ContentBox = styled(Box, {
  shouldForwardProp: prop => prop !== 'selected'
})<ContentBoxProps>(({ selected }) => ({
  display: selected ? 'flex' : 'none',
  flex: 1,
  flexDirection: 'column',
  overflowX: 'hidden',
  overflowY: 'auto'
}));

export const App = () => {
  const client = useClient();
  useEffect(() => {
    client.registerModel(TextModel);
    client.registerModel(MessengerModel);
  }, [client]);

  const [selected, setSelected] = useState(items[0].items[0].id);

  const handleListItemClick = (event: any, index: string) => {
    setSelected(index);
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      flexGrow: 1,
      height: '100vh'
    }}>
      <Box sx={{
        flexShrink: 0,
        width: 125,
        backgroundColor: colors.grey[100],
        borderRight: '1px solid',
        borderRightColor: 'divider'
      }}>
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
      </Box>

      {/* Display hidden so that components maintain state. */}

      <ContentBox selected={selected === 'config'}>
        <ConfigView />
      </ContentBox>
      <ContentBox selected={selected === 'storage'}>
        <StorageTab />
      </ContentBox>
      <ContentBox selected={selected === 'halo.keyring'}>
        <Keyring />
      </ContentBox>
      <ContentBox selected={selected === 'halo.credentialMessages'}>
        <CredentialMessagesViewer />
      </ContentBox>
      <ContentBox selected={selected === 'echo.parties'}>
        <PartiesViewer />
      </ContentBox>
      <ContentBox selected={selected === 'echo.items'}>
        <ItemsViewer />
      </ContentBox>
      <ContentBox selected={selected === 'echo.feeds'}>
        <FeedsViewer />
      </ContentBox>
      <ContentBox selected={selected === 'mesh.signal'}>
        <Signal />
      </ContentBox>
      {/*
      <ContentBox selected={selected === 'mesh.swarmgraph'}>
        <SwarmGraph />
      </ContentBox>
      */}
      <ContentBox selected={selected === 'mesh.swarminfo'}>
        <SwarmDetails />
      </ContentBox>
      <ContentBox selected={selected === 'debug.logging'}>
        <LoggingView />
      </ContentBox>
    </Box>
  );
};
