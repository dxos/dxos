//
// Copyright 2023 DXOS.org
//

import { meta } from '#meta';

export const SHORTCUTS_DIALOG = `${meta.profile.key}.ShortcutsDialog`;

export const DXOS_GUILD_ID = '837138313172353095';

export const DISCORD_SERVICE_URL = 'https://discord-service.dxos.workers.dev';

/** GitHub repo the prefilled new-issue URL targets. Matches HelpMenu's GITHUB_URL. */
export const GITHUB_NEW_ISSUE_URL = 'https://github.com/dxos/dxos/issues/new';

export const DEFAULT_TEAM = new Set<string>(['Rich', 'Josiah', 'Mykola', 'Dmytro']);

/**
 * Free-form node type tag for the virtual Home node. Avoids the ECHO-object node matchers in app-graph.
 */
export const SPACE_HOME_NODE_TYPE = `${meta.profile.key}.space-home-node`;
