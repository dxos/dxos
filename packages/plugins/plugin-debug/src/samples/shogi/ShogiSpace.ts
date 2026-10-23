//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { PluginSpace } from '../plugin/index.ts';
import content from './SPEC.mdl?raw';

/** A shogi board in every space: the game's rules are the hard part, so drops stay out of scope. */
export const CONFIG: PluginSpace.Config = {
  id: 'org.dxos.plugin-debug.template.shogi',
  space: { name: 'Shogi Plugin', icon: 'castle-turret', hue: 'amber' },
  description:
    'A partial spec, its feature map and a plan for the agent to finish: it completes the spec, draws it, files the tasks and publishes a shogi plugin to your private registry.',
  name: 'Shogi',
  npmName: 'shogi',
  packages: ['app-framework', 'app-graph', 'app-toolkit', 'echo', 'echo-react', 'react-ui', 'react-ui-attention'],
  summary:
    'A Composer plugin that puts a shogi board in every space, built in a sandbox on EDGE and published to the private plugin registry.',
  spec: { content, path: 'shogi/SPEC.mdl' },
  features: [
    {
      name: 'Board',
      description: 'A Board page under a Shogi group in each space, opening on the starting position.',
      feat: 'F-1',
      subfeatures: [
        { name: 'Navtree group', status: 'planned' },
        { name: 'Starting position', status: 'planned' },
      ],
      // The diagram draws the plugin the spec states; the agent links its own implementation tasks to every feature.
      tasks: [1],
    },
    {
      name: 'Moves',
      description: "Each kind's standard moves, sente first and turns alternating, stored as the space's game.",
      feat: 'F-2',
      tasks: [],
    },
    {
      name: 'Captures and promotion',
      description: "A capture moves the piece to its captor's hand; a piece entering the last three ranks may promote.",
      feat: 'F-3',
      tasks: [],
    },
    {
      name: 'Published to the registry',
      description: 'Built in the sandbox and published privately, so Plugins → Registry lists it for the reader.',
      feat: 'F-4',
      tasks: [],
    },
  ],
  completeSpec:
    "They are Moves (F-2), Captures and promotion (F-3) and Published to the registry (F-4). Moves are the standard ones for each kind, with sente moving first and turns alternating; a capture puts the piece in its captor's hand, shown beside the board; a piece entering the last three ranks may promote, and must where it could not move again. Drops stay out of scope.",
  shows: 'its Board page in a space',
  brief: [
    'The guide\'s "Example: a plugin with its own navtree group" section holds every file a plugin with a navtree group and a page needs.',
    'The game is an ECHO type, one per space, stored on the first move; until then the board shows the starting position.',
  ],
};

export const make = (toolchain: PluginSpace.Toolchain) => PluginSpace.make(CONFIG, toolchain);

export const makeTemplate = (toolchain: PluginSpace.Toolchain): AppCapabilities.SpaceTemplate =>
  PluginSpace.makeTemplate(CONFIG, toolchain);
