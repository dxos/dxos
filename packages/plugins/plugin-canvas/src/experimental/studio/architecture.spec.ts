//
// Copyright 2026 DXOS.org
//

//
// The Architecture slide: the same five layers on the client and at the EDGE, facing each other through the router
// that carries every request between them.
//

import { type SlideCard, type SlideSpec } from './spec.ts';

const SERVICES = [
  { icon: 'database', label: 'ECHO', tone: 'accent' },
  { icon: 'sparkle', label: 'AI', tone: 'accent' },
  { icon: 'user-circle', label: 'Identity', tone: 'accent' },
  { icon: 'files', label: 'Blobs', tone: 'accent' },
  { icon: 'robot', label: 'Agents', tone: 'accent' },
  { icon: 'video-camera', label: 'Calls' },
  { icon: 'waveform', label: 'Transcription' },
  { icon: 'cube', label: 'Sandbox' },
];

const layer = (id: string, label: string, icon: string, body: string, footer: string, tone?: string): SlideCard => ({
  id,
  label,
  icon,
  body,
  footer,
  variant: 'compact',
  ...(tone ? { tone } : {}),
});

/** The services card: a grid of what runs, the ones only the EDGE has drawn as ghosts on the client. */
const services = (id: string, label: string, footer: string, ghosts: boolean): SlideCard => ({
  id,
  label,
  icon: 'stack',
  footer,
  variant: 'compact',
  chips: {
    cols: 4,
    flat: true,
    items: SERVICES.map((chip) => ({ ...chip, ...(ghosts && !chip.tone ? { ghost: true } : {}) })),
  },
});

export const ARCHITECTURE: SlideSpec = {
  id: 'architecture',
  title: 'Architecture',
  metrics: { cardWidth: 592, bodyCardHeight: 136, rowGap: 24, columnGap: 96, groupGap: 96, boxPadding: 32 },
  groups: [
    {
      id: 'client',
      heading: 'Client · app tab + shared worker',
      box: true,
      columns: [
        [
          layer(
            'c-plugins',
            'Plugins',
            'puzzle-piece',
            'Surfaces, operations and skills in each app tab.',
            'navtree · markdown · assistant · +100',
          ),
          layer(
            'c-halo',
            'HALO Vault',
            'vault',
            'Keys and credentials for this device and its agents.',
            'keyring · identity',
            'accent',
          ),
          layer('c-runtime', 'Runtime', 'cpu', 'Effect service layers, shared by every tab.', 'WorkerRuntime'),
          services('c-services', 'Client services', 'client-protocol · RPC from every tab', true),
          layer(
            'c-spaces',
            'Spaces',
            'cube',
            'A local replica of every space, in SQLite on OPFS.',
            'EchoHost · SpaceManager',
          ),
        ],
      ],
    },
    {
      id: 'router',
      // The router is one narrow card between two wide columns, as the deck draws it.
      cardWidth: 176,
      columns: [
        [
          {
            id: 'router',
            label: 'Router',
            icon: 'arrows-left-right',
            footer: 'RouterObject DO',
            variant: 'compact',
            tone: 'ink',
          },
        ],
      ],
    },
    {
      id: 'edge',
      heading: 'EDGE · Workers + Durable Objects',
      box: true,
      columns: [
        [
          layer(
            'e-plugins',
            'Plugins',
            'puzzle-piece',
            'Plugin services that run next to the data.',
            'layerSpec · workerd',
          ),
          layer(
            'e-halo',
            'HALO',
            'shield-check',
            'Credential chains and membership, checked on every request.',
            'identity · kms · state machine',
            'accent',
          ),
          layer(
            'e-runtime',
            'Plugin Manager',
            'plugs-connected',
            'Loads plugin services and runs them per space.',
            'Workers · service bindings',
          ),
          services('e-services', 'EDGE services', 'db · ai · calls · transcription · sandbox', false),
          layer(
            'e-spaces',
            'Space',
            'cube',
            'One Durable Object group per space.',
            'replicator · indexer · feeds · scheduler',
          ),
        ],
      ],
    },
  ],
  edges: [
    { from: 'c-plugins', to: 'e-plugins', label: 'one plugin, two halves' },
    { from: 'c-halo', to: 'router', label: 'credentials' },
    { from: 'router', to: 'e-halo' },
    { from: 'c-runtime', to: 'router', label: 'activation' },
    { from: 'router', to: 'e-runtime' },
    { from: 'c-services', to: 'router', label: 'RPC' },
    { from: 'router', to: 'e-services' },
    { from: 'c-spaces', to: 'router', label: 'sync' },
    { from: 'router', to: 'e-spaces' },
  ],
  note: 'Outlined services run only at the EDGE; the worker reaches them through the router.',
};
