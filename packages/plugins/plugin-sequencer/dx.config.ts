//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { SequencerNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SequencerNamespace.key,
    name: 'Sequencer',
    author: 'DXOS',
    description: trim`
      SequencerPlugin is a collaborative music step-grid editor embedded in DXOS
      Composer. A Score is a first-class ECHO object that owns a roster of tracks
      and a collection of Sequence objects. Each Sequence holds an array of Notes
      with MIDI pitch (0-127), start time and duration in beats, velocity, and an
      opaque data bag for per-note metadata added by patches or extensions. Scores
      also carry tempo (BPM), time signature, and display name so they integrate
      naturally with the workspace navtree.

      The editing surface is a 2D piano-roll grid rendered by the canvas-based
      CellGrid component (src/components/CellGrid). Pitch runs on the y-axis
      (high pitches at the top, matching standard piano-roll convention) and time
      runs on the x-axis at a configurable beats-per-cell resolution (default
      16th notes). Clicking an empty cell adds a note; clicking a filled cell
      removes it; dragging paints notes across multiple cells in a single gesture.
      Pitch labels and the beat ruler stay frozen during scroll and zoom so
      orientation is always clear.

      The TrackList panel on the left lets users add and remove tracks, toggle
      mute per track, and select which track's sequence is shown in the grid.
      Removing a track cascades to delete all sequences that reference it.
      Selecting a track that has no sequence yet automatically creates an empty
      one, so the grid is always ready to edit.

      Playback advances a visual playhead across the active sequence at the
      score's tempo and loops at the end of the sequence length. The play/stop
      controls live in the ScoreArticle toolbar alongside the tempo control.
      Phase 2 of the roadmap adds sequence arrangement, a sound engine for
      audible playback, and richer sequence editing workflows.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sequencer',
    icon: { key: 'ph--music-notes--regular', hue: 'fuchsia' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    // Both node and workerd invoke the Score Read/Write operations behind the sequencer skill's tool
    // calls, so the handler has to be reachable headlessly, not just from the browser surface.
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: SequencerNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.section'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
