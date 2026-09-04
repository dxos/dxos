//
// Copyright 2026 DXOS.org
//

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

/** `disposition` value an action opts into to appear in an object toolbar (vs context-menu-only). */
export const TOOLBAR_DISPOSITION = 'toolbar';

/** Filter for {@link graphActions}: keeps only actions a producer opted into the toolbar. */
export const isToolbarAction = (action: AppGraphNode.ActionLike): boolean =>
  AppGraphNode.hasDisposition(action, TOOLBAR_DISPOSITION);

/**
 * `disposition` value an action opts into to appear in the row beside a text input — a chat prompt
 * today.
 *
 * Separate from {@link TOOLBAR_DISPOSITION} because the two surfaces act on different things: an
 * object toolbar acts on the object, a prompt row acts on the text being composed. Commenting on a
 * document belongs in the first and means nothing in the second; dictation belongs in both, and says
 * so by listing both (`disposition` takes an array).
 */
export const PROMPT_DISPOSITION = 'prompt';

/** Filter for {@link graphActions}: keeps only actions a producer opted into a prompt row. */
export const isPromptAction = (action: AppGraphNode.ActionLike): boolean =>
  AppGraphNode.hasDisposition(action, PROMPT_DISPOSITION);
