//
// Copyright 2020 DXOS.org
//

export type SectionItem = {
  id: string;
  title: string;
  icon: string;
  items?: SectionItem[];
};

/**
 * Used by sidebar. Keep in sync with `useRoutes`.
 */
export const useSections = (): SectionItem[] => [
  {
    id: 'client',
    title: 'Client',
    icon: 'ph--users--regular',
    items: [
      {
        id: '/client/config',
        title: 'Config',
        icon: 'ph--gear--regular',
      },
      {
        id: '/client/storage',
        title: 'Storage',
        icon: 'ph--hard-drives--regular',
      },
      {
        id: '/client/logs',
        title: 'Logs',
        icon: 'ph--receipt--regular',
      },
      {
        id: '/client/diagnostics',
        title: 'Diagnostics',
        icon: 'ph--chart-line--regular',
      },
      {
        id: '/client/tracing',
        title: 'Tracing',
        icon: 'ph--fire-simple--regular',
      },
    ],
  },
  {
    id: 'halo',
    title: 'HALO',
    icon: 'ph--identification-badge--regular',
    items: [
      {
        id: '/halo/identity',
        title: 'Identity',
        icon: 'ph--identification-badge--regular',
      },
      {
        id: '/halo/devices',
        title: 'Devices',
        icon: 'ph--devices--regular',
      },
      {
        id: '/halo/keyring',
        title: 'Keyring',
        icon: 'ph--key--regular',
      },
      {
        id: '/halo/credentials',
        title: 'Credentials',
        icon: 'ph--credit-card--regular',
      },
    ],
  },
  {
    id: 'echo',
    title: 'ECHO',
    icon: 'ph--database--regular',
    items: [
      {
        id: '/echo/spaces',
        title: 'Spaces',
        icon: 'ph--graph--regular',
      },
      {
        id: '/echo/space',
        title: 'Space',
        icon: 'ph--planet--regular',
      },
      {
        id: '/echo/feeds',
        title: 'Feeds',
        icon: 'ph--queue--regular',
      },
      {
        id: '/echo/objects',
        title: 'Objects',
        icon: 'ph--database--regular',
      },
      {
        id: '/echo/automerge',
        title: 'Automerge',
        icon: 'ph--gear-six--regular',
      },
      {
        id: '/echo/members',
        title: 'Members',
        icon: 'ph--users--regular',
      },
      {
        id: '/echo/metadata',
        title: 'Metadata',
        icon: 'ph--hard-drive--regular',
      },
    ],
  },
  {
    id: 'mesh',
    title: 'MESH',
    icon: 'ph--graph--regular',
    items: [
      {
        id: '/mesh/signal',
        title: 'Signal',
        icon: 'ph--wifi-high--regular',
      },
      {
        id: '/mesh/swarm',
        title: 'Swarm',
        icon: 'ph--users-three--regular',
      },
      {
        id: '/mesh/network',
        title: 'Network',
        icon: 'ph--polygon--regular',
      },
    ],
  },
  {
    id: 'agent',
    title: 'AGENT',
    icon: 'ph--robot--regular',
    items: [
      {
        id: '/agent/dashboard',
        title: 'Dashboard',
        icon: 'ph--computer-tower--regular',
      },
      {
        id: '/agent/search',
        title: 'Search',
        icon: 'ph--magnifying-glass--regular',
      },
    ],
  },
  {
    id: 'edge',
    title: 'EDGE',
    icon: 'ph--cloud--regular',
    items: [
      {
        id: '/edge/workflows',
        title: 'Workflows',
        icon: 'ph--function--regular',
      },
      {
        id: '/edge/dashboard',
        title: 'Dashboard',
        icon: 'ph--computer-tower--regular',
      },
      {
        id: '/edge/traces',
        title: 'Traces',
        icon: 'ph--line-segments--regular',
      },
      {
        id: '/edge/testing',
        title: 'Testing',
        icon: 'ph--flask--regular',
      },
    ],
  },
];
