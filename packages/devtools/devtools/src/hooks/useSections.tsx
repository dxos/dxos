//
// Copyright 2020 DXOS.org
//

import {
  ChartLine,
  CreditCard,
  Database,
  FireSimple,
  Gear,
  Graph,
  HardDrive,
  HardDrives,
  Icon,
  IdentificationBadge,
  Key,
  Planet,
  Polygon,
  Queue,
  Receipt,
  Users,
  UsersThree,
  WifiHigh,
} from '@phosphor-icons/react';

export type SectionItem = {
  id: string;
  title: string;
  Icon: Icon;
  items?: SectionItem[];
};

/**
 * Used by sidebar. Keep in sync with `useRoutes`.
 */
export const useSections = (): SectionItem[] => {
  return [
    {
      id: '/client',
      title: 'Client',
      Icon: Users,
      items: [
        {
          id: '/client/config',
          title: 'Config',
          Icon: Gear,
        },
        {
          id: '/client/storage',
          title: 'Storage',
          Icon: HardDrives,
        },
        {
          id: '/client/logs',
          title: 'Logs',
          Icon: Receipt,
        },
        {
          id: '/client/diagnostics',
          title: 'Diagnostics',
          Icon: ChartLine,
        },
        {
          id: '/client/tracing',
          title: 'Tracing',
          Icon: FireSimple,
        },
      ],
    },
    {
      id: '/halo',
      title: 'HALO',
      Icon: IdentificationBadge,
      items: [
        {
          id: '/halo/identity',
          title: 'Identity',
          Icon: IdentificationBadge,
        },
        {
          id: '/halo/keyring',
          title: 'Keyring',
          Icon: Key,
        },
        {
          id: '/halo/credentials',
          title: 'Credentials',
          Icon: CreditCard,
        },
      ],
    },
    {
      id: '/echo',
      title: 'ECHO',
      Icon: Database,
      items: [
        {
          id: '/echo/spaces',
          title: 'Spaces',
          Icon: Graph,
        },
        {
          id: '/echo/space',
          title: 'Space',
          Icon: Planet,
        },
        {
          id: '/echo/feeds',
          title: 'Feeds',
          Icon: Queue,
        },
        {
          id: '/echo/items',
          title: 'Items',
          Icon: Database,
        },
        {
          id: '/echo/members',
          title: 'Members',
          Icon: Users,
        },
        {
          id: '/echo/metadata',
          title: 'Metadata',
          Icon: HardDrive,
        },
        // {
        //   id: '/echo/snapshots',
        //   title: 'Snapshots',
        //   Icon: <SnapshotsIcon />
        // }
      ],
    },
    {
      id: 'mesh',
      title: 'MESH',
      Icon: Graph,
      items: [
        {
          id: '/mesh/signal',
          title: 'Signal',
          Icon: WifiHigh,
        },
        {
          id: '/mesh/swarm',
          title: 'Swarm',
          Icon: UsersThree,
        },
        {
          id: '/mesh/network',
          title: 'Network',
          Icon: Polygon,
        },
      ],
    },
    // {
    //   id: '/dmg',
    //   title: 'DMG',
    //   items: [
    //     {
    //       id: '/dmg/registry',
    //       title: 'Registry',
    //       icon: <RegistryIcon />
    //     }
    //   ]
    // },
    // {
    //   id: '/debug',
    //   title: 'Debug',
    //   items: [
    //     {
    //       id: '/debug/logging',
    //       title: 'Logging',
    //       icon: <LoggingIcon />
    //     },
    //     {
    //       id: '/debug/rpc',
    //       title: 'RPC Trace',
    //       icon: <MessagesIcon />
    //     }
    //   ]
    // }
  ];
};
