//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.zen',
    name: 'Zen',
    author: 'DXOS',
    description: trim`
    ZenPlugin is an ambient sound and meditation plugin for DXOS Composer. Users create and edit Dream
    objects — named, duration-bound soundscapes composed of layered audio sequences that play through
    the Web Audio API. Each sequence is either a looped sample (fireplace, ocean, rain, stream, thunder,
    or gong) or a procedurally generated binaural beat with independent volume and mute controls.

    The binaural beat generator synthesises two stereo sine oscillators whose frequency difference
    produces a perceived beat: delta (2 Hz, deep sleep), theta (6 Hz, light sleep), alpha (10 Hz,
    relaxation), and beta (20 Hz, focus). An optional pink-noise layer can be blended in per generator
    track. All parameters update in real-time via AudioParam ramp transitions while playing.

    Timed dreams count down to zero with a 10-second master-gain fade-out before auto-stopping.
    Layers can be added, deleted, reordered by drag-and-drop, and hot-swapped while playing.
    A Form-based Editor surface lets users set the dream name and total duration with auto-save to ECHO.

    Dream objects and their sequences are stored in the ECHO space and replicate across devices,
    so a soundscape configured on one device is immediately available on others. Settings and
    sequence state persist even when the plugin is closed and reopened.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-zen',
    icon: { key: 'ph--moon-stars--regular', hue: 'violet' },
    tags: ['labs'],
    spec: 'PLUGIN.mdl',
  },
});
