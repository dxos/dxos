//
// Copyright 2026 DXOS.org
//

import { type NetworkSpec, type NetworkTemplate } from '../model/index.ts';

const sites = (count: number, near?: string): NetworkSpec[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `site-${index + 1}`,
    kind: 'devices',
    generate: { nodes: { type: index % 3 === 0 ? 'laptop' : 'phone', count: [1, 3] } },
    ...(near ? { layout: { near } } : {}),
  }));

const REGION: NetworkSpec = { id: 'region', kind: 'servers', generate: { nodes: { type: 'server', count: [2, 4] } } };

/** One laptop beside a large provider cloud, with a constellation of other users around it. */
export const CENTRALIZED_TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'cloud',
      kind: 'cloud',
      layout: { at: [0, 0] },
      generate: {
        nodes: { type: 'server', count: [10, 12] },
        networks: { template: 'region', count: [4, 5], depth: 3 },
      },
    },
    {
      id: 'office',
      kind: 'devices',
      layout: { near: 'cloud' },
      nodes: [{ id: 'laptop', type: 'laptop', props: { app: 'editor' } }],
    },
    ...sites(32),
  ],
  templates: { region: REGION },
  links: [{ rule: 'cloud', scope: '*', ratio: 1 }],
  layout: { gap: 500, spread: 9000 },
};

export const CENTRALIZED_FLOW = `flow C-1: Centralized
  seed: 11
  steps:
    - name: A laptop running an app
      camera: { view: iso, focus: office/laptop, zoom: 1.4, over: 0s }
      caption: A laptop running an app
      mark: Laptop
      hold: 10s
    - name: The edge of the provider's network
      camera: { view: top, focus: office/laptop, zoom: 0.18, over: 6s }
      send: { from: office/laptop, to: 'cloud/**', rate: 2/s }
      caption: Every change goes to the provider's servers
      mark: Provider
      hold: 14s
    - name: Everyone else
      show: { target: 'site-*', stagger: 120ms }
      camera: { fit: '*', over: 6s }
      traffic: { scope: '**', rate: 8/s }
      caption: and so does everyone else's
      mark: Constellation
      hold: 20s
`;

/** A phone and laptop in a home network, neighbouring local networks, and a layered cloud. */
export const DECENTRALIZED_TEMPLATE: NetworkTemplate = {
  networks: [
    {
      id: 'cloud',
      kind: 'cloud',
      layout: { at: [0, 0] },
      generate: { nodes: { type: 'server', count: [6, 8] }, networks: { template: 'region', count: [3, 3], depth: 2 } },
    },
    {
      id: 'home',
      kind: 'devices',
      nodes: [
        { id: 'phone', type: 'phone' },
        { id: 'laptop', type: 'laptop' },
      ],
    },
    ...Array.from({ length: 4 }, (_, index): NetworkSpec => ({
      id: `local-${index + 1}`,
      kind: 'devices',
      generate: { nodes: { type: index % 2 === 0 ? 'phone' : 'laptop', count: [1, 3] } },
    })),
    ...sites(20),
  ],
  templates: { region: REGION },
  links: [
    { rule: 'nearby', k: 2, scope: 'home, local-*, site-*' },
    { rule: 'cloud', scope: '*', ratio: 0.6 },
  ],
  layout: { gap: 400, spread: 7000 },
};

export const DECENTRALIZED_FLOW = `flow D-1: Decentralized
  seed: 7
  steps:
    - name: Phone
      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 0s }
      set: { home/phone.app: chat, home/laptop.app: chat }
      caption: A message is typed on the phone
      mark: Devices
      hold: 8s
    - name: Laptop
      camera: { focus: home/laptop, zoom: 1.5, over: 3s }
      send: { from: home/phone, to: home/laptop, rate: 1/s }
      caption: It arrives on the laptop, directly
      hold: 10s
    - name: Local network
      show: { target: home, exact: true }
      camera: { fit: home, over: 2s }
      caption: Both belong to one local network
      hold: 8s
    - name: Neighbours
      show: { target: 'local-*', stagger: 300ms }
      camera: { fit: 'home, local-*', over: 4s }
      traffic: { scope: 'home, local-*', rate: 3/s }
      caption: Local networks talk to their neighbours
      mark: Local networks
      hold: 14s
    - name: Top view
      camera: { view: top, over: 3s }
      hold: 6s
    - name: The cloud
      show: [{ target: 'site-*', stagger: 100ms }, cloud]
      camera: { fit: '*', over: 6s }
      traffic: { scope: '**', rate: 8/s }
      caption: and to a cloud with layers of its own
      mark: The cloud
      hold: 20s
    - name: Inside the cloud
      camera: { path: [{ fit: cloud }, { focus: cloud/region-1, zoom: 0.8 }], over: 8s }
      hold: 50s
    - name: Back out
      camera: { fit: '*', over: 6s }
      hold: 64s
`;
