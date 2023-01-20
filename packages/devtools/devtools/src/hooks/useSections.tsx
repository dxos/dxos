//
// Copyright 2020 DXOS.org
//

import {
  CreditCard,
  Database,
  Gear,
  Graph,
  HardDrive,
  IdentificationBadge,
  Key,
  PaperPlane,
  Queue,
  Users,
  UsersThree
} from 'phosphor-react';
import { FC } from 'react';

// TODO(burdon): Remove.
export const findItem = (items: SectionItem[], id: string): SectionItem | undefined => {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }

    if (item.items) {
      const subItem = findItem(item.items, id);
      if (subItem) {
        return subItem;
      }
    }
  }
};

export type SectionItem = {
  id: string;
  title: string;
  Icon?: FC;
  items?: SectionItem[];
};

export const useSections = () => {
  return sections;
};

export const sections: SectionItem[] = [
  {
    id: '/client',
    title: 'Client',
    Icon: Users,
    items: [
      {
        id: '/client/config',
        title: 'Config',
        Icon: Gear
      }
      // {
      //   id: '/client/storage',
      //   title: 'Storage',
      //   Icon: <StorageIcon />
      // }
    ]
  },
  {
    id: '/halo',
    title: 'HALO',
    Icon: IdentificationBadge,
    items: [
      {
        id: '/halo/identity',
        title: 'Identity',
        Icon: IdentificationBadge
      },
      {
        id: '/halo/keyring',
        title: 'Keyring',
        Icon: Key
      },
      {
        id: '/halo/credentials',
        title: 'Credentials',
        Icon: CreditCard
      }
    ]
  },
  {
    id: '/echo',
    title: 'ECHO',
    Icon: Database,
    items: [
      {
        id: '/echo/spaces',
        title: 'Spaces',
        Icon: HardDrive
      },
      {
        id: '/echo/feeds',
        title: 'Feeds',
        Icon: Queue
      },
      {
        id: '/echo/items',
        title: 'Items',
        Icon: Database
      },
      {
        id: '/echo/members',
        title: 'Members',
        Icon: Users
      }
      // {
      //   id: '/echo/snapshots',
      //   title: 'Snapshots',
      //   Icon: <SnapshotsIcon />
      // }
    ]
  },
  {
    id: 'mesh',
    title: 'MESH',
    Icon: Graph,
    items: [
      // {
      //   id: '/mesh/network',
      //   title: 'Network Graph',
      //   Icon: SwarmIcon
      // },
      {
        id: '/mesh/swarm',
        title: 'Swarm',
        Icon: UsersThree
      },
      {
        id: '/mesh/signal',
        title: 'Signal',
        Icon: PaperPlane
      }
    ]
  }
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
