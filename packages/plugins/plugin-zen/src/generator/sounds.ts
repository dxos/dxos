//
// Copyright 2026 DXOS.org
//

// Package specifiers, not relative paths: the library build leaves them external, so the 50 MB of audio
// stays out of `dist/` (and the build cache) and the app's bundler emits it from `assets/`.
import gong1 from '@dxos/plugin-zen/assets/instrument/gongs-1.m4a?url';
import gong2 from '@dxos/plugin-zen/assets/instrument/gongs-2.m4a?url';
import fireplace from '@dxos/plugin-zen/assets/nature/fireplace.m4a?url';
import ocean from '@dxos/plugin-zen/assets/nature/ocean.m4a?url';
import rain from '@dxos/plugin-zen/assets/nature/rain.m4a?url';
import stream from '@dxos/plugin-zen/assets/nature/stream.m4a?url';
import thunder from '@dxos/plugin-zen/assets/nature/thunder.m4a?url';

export const SAMPLE_URLS: Record<string, string> = {
  fireplace,
  ocean,
  rain,
  stream,
  thunder,
  gong1,
  gong2,
};
