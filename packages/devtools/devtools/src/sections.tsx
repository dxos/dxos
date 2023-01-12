//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Gear, Users, Graph, PaperPlane } from 'phosphor-react';

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
    id: 'client',
    Icon: Users,
    items: [
      {
        id: 'config',
        title: 'Config',
        Icon: Gear,
        panel: <ConfigPanel />
      }
      // // {
      // //   id: 'storage',
      // //   title: 'Storage',
      // //   icon: <StorageIcon />,
      // //   panel: <StoragePanel />
      // // }
    ]
  },
  // {
  //   title: 'HALO',
  //   id: 'halo',
  //   items: [
  //     {
  //       id: 'halo.identity',
  //       title: 'Identity',
  //       // Icon: <IdentityIcon />,
  //       panel: <IdentityPanel />
  //     },
  //     {
  //       id: 'halo.keyring',
  //       title: 'Keyring',
  //       // Icon: <KeyIcon />,
  //       panel: <KeyringPanel />
  //     },
  //     {
  //       id: 'halo.credentials',
  //       title: 'Credentials',
  //       // Icon: <CredentialsIcon />,
  //       panel: <CredentialsPanel />
  //     }
  //   ]
  // },
  // {
  //   title: 'ECHO',
  //   items: [
  //     {
  //       id: 'echo.spaces',
  //       title: 'Spaces',
  //       icon: <SpacesIcon />,
  //       panel: <SpacesPanel />
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
  //     }
  //     // {
  //     //   id: 'echo.snapshots',
  //     //   title: 'Snapshots',
  //     //   icon: <SnapshotsIcon />,
  //     //   panel: <SnapshotsPanel />
  //     // }
  //   ]
  // },
  {
    id: 'mesh',
    title: 'MESH',
    Icon: Graph,
    items: [
      // {
      //   id: 'mesh.network',
      //   title: 'Network Graph',
      //   icon: SwarmIcon,
      //   panel: NetworkPanel
      // },
      // {
      //   id: 'mesh.members',
      //   title: 'Members',
      //   icon: <IdentityIcon />,
      //   panel: <MembersPanel />
      // },
      // {
      //   id: 'mesh.swarminfo',
      //   title: 'Swarm',
      //   icon: <SwarmIcon />,
      //   panel: <SwarmPanel />
      // },
      {
        id: 'mesh.signal',
        title: 'Signal',
        Icon: PaperPlane,
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
