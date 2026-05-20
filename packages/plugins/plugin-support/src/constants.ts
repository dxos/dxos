//
// Copyright 2023 DXOS.org
//

import { meta } from '#meta';

export const SHORTCUTS_DIALOG = `${meta.id}.ShortcutsDialog`;

/**
 * Local id of the virtual Welcome node under the personal-space subtree.
 * Also used as the `data.subject` value for the Article surface filter.
 */
export const WELCOME_NODE_ID = 'welcome';

/**
 * Free-form node type tag for the virtual Welcome node. Avoids the ECHO-object
 * node matchers in app-graph.
 */
export const WELCOME_NODE_TYPE = `${meta.id}.welcome-node`;
