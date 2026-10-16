//
// Copyright 2026 DXOS.org
//

import * as Account from '@dxos/plugin-client/Account';

/** The account panel listing the agents the identity administers; also its singleton URL key. */
export const AGENTS_PANEL = 'agents';

/** The panel's qualified path, which its surface matches on. */
export const AGENTS_PANEL_PATH = Account.path(AGENTS_PANEL);
