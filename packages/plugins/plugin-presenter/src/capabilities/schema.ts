//
// Copyright 2026 DXOS.org
//

import { Text } from '@dxos/schema';

import { Presentation } from '#types';

/**
 * Schemas this plugin registers, loaded on demand so they stay out of the plugin body's module graph.
 */
export default [Presentation.Presentation, Presentation.Slide, Text.Text];
