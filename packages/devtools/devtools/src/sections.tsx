//
// Copyright 2020 DXOS.org
//

import React from 'react';

// https://mui.com/components/material-icons
import {
  AccountCircle as ProfileIcon,
  Grain as ItemsIcon,
  Dns as StorageIcon,
  List as MessagesIcon,
  FilterTiltShift as SwarmIcon,
  Group as PartiesIcon,
  List as FeedsIcon,
  // AppRegistration as RegistryIcon,
  Router as SignalIcon,
  Settings as ConfigIcon,
  SettingsBackupRestore as SnapshotsIcon,
  Subject as LoggingIcon,
  VpnKey as KeyIcon
} from '@mui/icons-material';

import {
  ConfigPanel,
  CredentialMessagesPanel,
  FeedsPanel,
  ItemsPanel,
  KeyringPanel,
  LoggingPanel,
  // NetworkPanel,
  PartiesPanel,
  ProfilePanel,
  // RegistryPanel,
  RpcTracePanel,
  Section,
  SignalPanel,
  SnapshotsPanel,
  StoragePanel,
  SwarmPanel
} from './containers';

export const sections: Section[] = [
  // {
  //   title: 'CLIENT',
  //   items: [
  //     {
  //       id: 'config',
  //       title: 'Config',
  //       icon: <ConfigIcon />,
  //       panel: <ConfigPanel />
  //     },
  //     {
  //       id: 'storage',
  //       title: 'Storage',
  //       icon: <StorageIcon />,
  //       panel: <StoragePanel />
  //     }
  //   ]
  // },
  // {
  //   title: 'HALO',
  //   items: [
  //     {
  //       id: 'halo.profile',
  //       title: 'Profile',
  //       icon: <ProfileIcon />,
  //       panel: <ProfilePanel />
  //     },
  //     {
  //       id: 'halo.keyring',
  //       title: 'Keyring',
  //       icon: <KeyIcon />,
  //       panel: <KeyringPanel />
  //     },
  //     {
  //       id: 'halo.messagess',
  //       title: 'Messages',
  //       icon: <MessagesIcon />,
  //       panel: <CredentialMessagesPanel />
  //     }
  //   ]
  // },
  // {
  //   title: 'ECHO',
  //   items: [
  //     {
  //       id: 'echo.parties',
  //       title: 'Parties',
  //       icon: <PartiesIcon />,
  //       panel: <PartiesPanel />
  //     },
  //     {
  //       id: 'echo.feeds',
  //       title: 'Feeds',
  //       icon: <FeedsIcon />,
  //       panel: <FeedsPanel />
  //     },
  //     {
  //       id: 'echo.items',
  //       title: 'Items',
  //       icon: <ItemsIcon />,
  //       panel: <ItemsPanel />
  //     },
  //     {
  //       id: 'echo.snapshots',
  //       title: 'Snapshots',
  //       icon: <SnapshotsIcon />,
  //       panel: <SnapshotsPanel />
  //     }
  //   ]
  // },
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
