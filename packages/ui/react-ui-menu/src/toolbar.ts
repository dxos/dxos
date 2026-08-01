//
// Copyright 2026 DXOS.org
//

import { Node } from '@dxos/app-graph';

/** `disposition` value an action opts into to appear in an object toolbar (vs context-menu-only). */
export const TOOLBAR_DISPOSITION = 'toolbar';

/** Filter for {@link graphActions}: keeps only actions a producer opted into the toolbar. */
export const isToolbarAction = (action: Node.ActionLike): boolean => Node.hasDisposition(action, TOOLBAR_DISPOSITION);
