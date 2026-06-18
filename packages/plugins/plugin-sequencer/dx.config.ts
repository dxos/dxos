//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.sequencer',
    name: 'Sequencer',
    description: trim`
      SequencerPlugin is a collaborative music step-grid editor embedded in DXOS
      Composer. A Score is a first-class ECHO object that owns a roster of tracks
      and a collection of Sequence objects. Each Sequence holds an array of Notes
      with MIDI pitch (0–127), start time and duration in beats, velocity, and an
      opaque data bag for per-note metadata added by patches or extensions. Scores
      also carry tempo (BPM), time signature, and display name so they integrate
      naturally with the workspace navtree.

      The editing surface is a 2D piano-roll grid rendered by the canvas-based
      CellGrid component from @dxos/react-ui-canvas. Pitch runs on the y-axis
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
});
