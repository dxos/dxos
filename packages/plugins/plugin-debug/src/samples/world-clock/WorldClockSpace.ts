//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { PluginSpace } from '../plugin/index.ts';
import content from './SPEC.mdl?raw';

/**
 * The plugin the Composer Plugin project template builds, seeded instead as a spec, a feature map and a plan, so a run
 * of it compares with the World Clock runs that template already records.
 */
export const CONFIG: PluginSpace.Config = {
  id: 'org.dxos.plugin-debug.template.worldClock',
  space: { name: 'World Clock Plugin', icon: 'planet', hue: 'sky' },
  description:
    'A partial spec, its feature map and a plan for the agent to finish: it completes the spec, draws it, files the tasks and publishes a world clock plugin to your private registry.',
  name: 'World Clock',
  npmName: 'world-clock',
  packages: [
    'app-framework',
    'app-graph',
    'app-toolkit',
    'echo',
    'echo-react',
    'react-ui',
    'react-ui-attention',
    'react-ui-form',
    'react-ui-geo',
    'plugin-map',
  ],
  summary:
    'A Composer plugin that adds a world clock page, a map with a row of clocks, under its own group in the navtree of every space, built in a sandbox on EDGE and published to the private plugin registry.',
  spec: { content, path: 'world-clock/SPEC.mdl' },
  features: [
    {
      name: 'Clocks page',
      description: 'A Clocks page under a World Clock group in each space: a row of ticking clock cards, west to east.',
      feat: 'F-1',
      subfeatures: [
        { name: 'Navtree group', status: 'planned' },
        { name: 'Ticking clocks', status: 'planned' },
      ],
      // The diagram draws the plugin the spec states; the agent links its own implementation tasks to every feature.
      tasks: [1],
    },
    {
      name: 'Map',
      description: "plugin-map's World surface above the row, a pin per clock; selecting a clock highlights both.",
      feat: 'F-2',
      tasks: [],
    },
    {
      name: 'Add and remove clocks',
      description: "The empty card's plus button opens a timezone form; each card's delete button removes its clock.",
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
    "They are Map (F-2), Add and remove clocks (F-3) and Published to the registry (F-4). The map is plugin-map's `World` surface above the row, with a marker per clock and the `type:Clock` as its `subject`; clicking a clock selects it with `LayoutOperation.Select`, which highlights its card and its pin. The empty card is the same size as the clock cards, with a large ghost plus button centered in it that opens a react-ui-form with a timezone select inside the card; saving adds the clock. Each card has a ghost delete button in its top-right corner.",
  shows: 'its Clocks page in a space',
  brief: [
    'The guide\'s "Example: a plugin with its own navtree group" and "Example: data, a form and another plugin\'s surface" sections hold every file the plugin needs; build the article from its put-together example.',
    "The `Clock` ECHO type holds a space's clocks, each a timezone and its position from `timezones` in `@dxos/react-ui-geo/data`, one object per space, stored on the first change. Render each card's delete button after the card's text, or the text covers it.",
    'Depend on `org.dxos.plugin.map` and tag the plugin `labs` in `dx.config.ts`, as the guide does.',
  ],
};

export const make = (toolchain: PluginSpace.Toolchain) => PluginSpace.make(CONFIG, toolchain);

export const makeTemplate = (toolchain: PluginSpace.Toolchain): AppCapabilities.SpaceTemplate =>
  PluginSpace.makeTemplate(CONFIG, toolchain);
