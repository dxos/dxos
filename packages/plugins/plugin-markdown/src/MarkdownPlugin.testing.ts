//
// Copyright 2025 DXOS.org
//

import * as MarkdownPlugin from './MarkdownPlugin';

/** Plugin metadata, available without loading any module body. */
export const meta = MarkdownPlugin.meta;

/**
 * Constructs the plugin. A plain re-export now that the descriptor builds it eagerly — the previous
 * lazy stub could not settle its dynamic import under webkit in storybook.
 */
export const make = MarkdownPlugin.make;
