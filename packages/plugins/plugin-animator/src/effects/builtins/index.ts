//
// Copyright 2026 DXOS.org
//

//
// The built-in effects (F-5.6, F-8.4): sources an agent can read as examples and a user can place at once. They are
// installed into a space as ordinary Effect objects (`InstallEffects`), so they are edited and versioned like any other.
//

import { type Animation } from '#types';

import { BURST_PARAMS, BURST_SOURCE } from './burst.ts';
import { CALLOUT_PARAMS, CALLOUT_SOURCE } from './callout.ts';
import { CONVERSATIONS_PARAMS, CONVERSATIONS_SOURCE } from './conversations.ts';
import { PACKET_FLOW_PARAMS, PACKET_FLOW_SOURCE } from './packet-flow.ts';

export type BuiltinEffect = {
  name: string;
  description: string;
  renderer: Animation.EffectRenderer;
  source: string;
  params: Record<string, unknown>;
};

export const BUILTIN_EFFECTS: readonly BuiltinEffect[] = [
  {
    name: 'Packet flow',
    description: 'Bursts of packets along links, coloured by their source, with an alert share drawn red.',
    renderer: '2d',
    source: PACKET_FLOW_SOURCE,
    params: PACKET_FLOW_PARAMS,
  },
  {
    name: 'Packet flow (3D)',
    description: 'Bursts of packet spheres along links, coloured by their source, with an alert share drawn red.',
    renderer: '3d',
    source: PACKET_FLOW_SOURCE,
    params: PACKET_FLOW_PARAMS,
  },
  {
    name: 'Burst',
    description: 'Objects split into particles that fly apart and fade.',
    renderer: '2d',
    source: BURST_SOURCE,
    params: BURST_PARAMS,
  },
  {
    name: 'Burst (3D)',
    description: 'Objects split into particle spheres that fly apart and fade.',
    renderer: '3d',
    source: BURST_SOURCE,
    params: BURST_PARAMS,
  },
  {
    name: 'Conversations',
    description: 'Tiny message threads beside objects, at most one per object.',
    renderer: 'overlay',
    source: CONVERSATIONS_SOURCE,
    params: CONVERSATIONS_PARAMS,
  },
  {
    name: 'Callout',
    description: "An object's card in the margin, joined to it by a line, with messages arriving under it.",
    renderer: 'overlay',
    source: CALLOUT_SOURCE,
    params: CALLOUT_PARAMS,
  },
];
