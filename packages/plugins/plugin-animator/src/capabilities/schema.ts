//
// Copyright 2026 DXOS.org
//

import { Animation } from '#types';

/** Schemas this plugin registers, loaded on demand so they stay out of the plugin body's module graph. */
export default [Animation.Animation, Animation.Effect];
