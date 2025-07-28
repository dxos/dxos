//
// Copyright 2020 DXOS.org
//

import { type IconName } from '@dxos/react-ui';

export type SectionItem = {
  id: string;
  title: string;
  Icon: IconName;
  items?: SectionItem[];
};

/**
 * Used by sidebar. Keep in sync with `useRoutes`.
 */
export const useSections = (): SectionItem[] => {
  return [
    {
      id: 'client',
      title: 'Client',
      Icon: 'ph--users--regular',
      items: [
        {
          id: '/client/config',
          title: 'Config',
          Icon: 'ph--gear--regular',
        },
        {
          id: '/client/storage',
          title: 'Storage',
          Icon: 'ph--hard-drives--regular',
        },
        {
          id: '/client/logs',
          title: 'Logs',
          Icon: 'ph--receipt--regular',
        },
        {
          id: '/client/diagnostics',
          title: 'Diagnostics',
          Icon: 'ph--chart-line--regular',
        },
        {
          id: '/client/tracing',
          title: 'Tracing',
          Icon: 'ph--fire-simple--regular',
        },
      ],
    },
    {
      id: 'halo',
      title: 'HALO',
      Icon: 'ph--identification-badge--regular',
      items: [
        {
          id: '/halo/identity',
          title: 'Identity',
          Icon: 'ph--identification-badge--regular',
        },
        {
          id: '/halo/devices',
          title: 'Devices',
          Icon: 'ph--devices--regular',
        },
        {
          id: '/halo/keyring',
          title: 'Keyring',
          Icon: 'ph--key--regular',
        },
        {
          id: '/halo/credentials',
          title: 'Credentials',
          Icon: 'ph--credit-card--regular',
        },
      ],
    },
    {
      id: 'echo',
      title: 'ECHO',
      Icon: 'ph--database--regular',
      items: [
        {
          id: '/echo/spaces',
          title: 'Spaces',
          Icon: 'ph--graph--regular',
        },
        {
          id: '/echo/space',
          title: 'Space',
          Icon: 'ph--planet--regular',
        },
        {
          id: '/echo/feeds',
          title: 'Feeds',
          Icon: 'ph--queue--regular',
        },
        {
          id: '/echo/objects',
          title: 'Objects',
          Icon: 'ph--database--regular',
        },
        {
          id: '/echo/automerge',
          title: 'Automerge',
          Icon: 'ph--gear-six--regular',
        },
        {
          id: '/echo/members',
          title: 'Members',
          Icon: 'ph--users--regular',
        },
        {
          id: '/echo/metadata',
          title: 'Metadata',
          Icon: 'ph--hard-drive--regular',
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
      Icon: 'ph--graph--regular',
      items: [
        {
          id: '/mesh/signal',
          title: 'Signal',
          Icon: 'ph--wifi-high--regular',
        },
        {
          id: '/mesh/swarm',
          title: 'Swarm',
          Icon: 'ph--users-three--regular',
        },
        {
          id: '/mesh/network',
          title: 'Network',
          Icon: 'ph--polygon--regular',
        },
      ],
    },
    {
      id: 'agent',
      title: 'AGENT',
      Icon: 'ph--robot--regular',
      items: [
        {
          id: '/agent/dashboard',
          title: 'Dashboard',
          Icon: 'ph--computer-tower--regular',
        },
        {
          id: '/agent/search',
          title: 'Search',
          Icon: 'ph--magnifying-glass--regular',
        },
      ],
    },
    {
      id: 'edge',
      title: 'EDGE',
      Icon: 'ph--cloud--regular',
      items: [
        {
          id: '/edge/workflows',
          title: 'Workflows',
          Icon: 'ph--function--regular',
        },
        {
          id: '/edge/dashboard',
          title: 'Dashboard',
          Icon: 'ph--computer-tower--regular',
        },
        {
          id: '/edge/traces',
          title: 'Traces',
          Icon: 'ph--line-segments--regular',
        },
        {
          id: '/edge/testing',
          title: 'Testing',
          Icon: 'ph--flask--regular',
        },
      ],
    },
  ];
};
