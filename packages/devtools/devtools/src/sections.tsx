//
// Copyright 2020 DXOS.org
//

import React from 'react';

// https://mui.com/components/material-icons
import {
  AccountCircle as IdentityIcon,
  Grain as ItemsIcon,
  FilterTiltShift as SwarmIcon,
  Group as SpacesIcon,
  List as FeedsIcon,
  List as CredentialsIcon,
  // AppRegistration as RegistryIcon,
  Router as SignalIcon,
  Settings as ConfigIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';

import {
  ConfigPanel,
  CredentialsPanel,
  FeedsPanel,
  IdentityPanel,
  ItemsPanel,
  MembersPanel,
  // NetworkPanel,
  KeyringPanel,
  SpacesPanel,
  Section,
  SignalPanel,
  SwarmPanel
} from './containers';

export const sections: Section[] = [
  {
    title: 'CLIENT',
    items: [
      {
        id: 'config',
        title: 'Config',
        icon: <ConfigIcon />,
        panel: <ConfigPanel />
      }
      // {
      //   id: 'storage',
      //   title: 'Storage',
      //   icon: <StorageIcon />,
      //   panel: <StoragePanel />
      // }
    ]
  },
  {
    title: 'HALO',
    items: [
      {
        id: 'halo.identity',
        title: 'Identity',
        icon: <IdentityIcon />,
        panel: <IdentityPanel />
      },
      {
        id: 'halo.keyring',
        title: 'Keyring',
        icon: <KeyIcon />,
        panel: <KeyringPanel />
      },
      {
        id: 'halo.credentials',
        title: 'Credentials',
        icon: <CredentialsIcon />,
        panel: <CredentialsPanel />
      }
    ]
  },
  {
    title: 'ECHO',
    items: [
      {
        id: 'echo.spaces',
        title: 'Spaces',
        icon: <SpacesIcon />,
        panel: <SpacesPanel />
      },
      {
        id: 'echo.feeds',
        title: 'Feeds',
        icon: <FeedsIcon />,
        panel: <FeedsPanel />
      },
      {
        id: 'echo.items',
        title: 'Items',
        icon: <ItemsIcon />,
        panel: <ItemsPanel />
      }
      // {
      //   id: 'echo.snapshots',
      //   title: 'Snapshots',
      //   icon: <SnapshotsIcon />,
      //   panel: <SnapshotsPanel />
      // }
    ]
  },
  {
    title: 'MESH',
    items: [
      /*
      {
        id: 'mesh.network',
        title: 'Network Graph',
        icon: SwarmIcon,
        panel: NetworkPanel
      },
      */
      {
        id: 'mesh.members',
        title: 'Members',
        icon: <IdentityIcon />,
        panel: <MembersPanel />
      },
      {
        id: 'mesh.swarminfo',
        title: 'Swarm',
        icon: <SwarmIcon />,
        panel: <SwarmPanel />
      },
      {
        id: 'mesh.signal',
        title: 'Signal',
        icon: <SignalIcon />,
        panel: <SignalPanel />
      }
    ]
  }
  // {
  //   title: 'DXNS',
  //   items: [
  //     {
  //       id: 'dxns.registry',
  //       title: 'Registry',
  //       icon: <RegistryIcon />,
  //       panel: <RegistryPanel />
  //     }
  //   ]
  // },
  // {
  //   title: 'DEBUG',
  //   items: [
  //     {
  //       id: 'debug.logging',
  //       title: 'Logging',
  //       icon: <LoggingIcon />,
  //       panel: <LoggingPanel />
  //     },
  //     {
  //       id: 'rpc',
  //       title: 'RPC Trace',
  //       icon: <MessagesIcon />,
  //       panel: <RpcTracePanel />
  //     }
  //   ]
  // }
];
