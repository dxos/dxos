//
// Copyright 2026 DXOS.org
//

import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

/** Node id (local segment) of the per-space "Agents" section under space settings. */
export const AGENTS_SECTION_ID = 'agents';

/** Graph node type (and surface literal) of the per-space "Agents" section. */
export const AGENTS_SECTION_TYPE = 'org.dxos.plugin.agent.space-settings';

/** Deck subject of an agent, which is listed under its space's Agents section. */
export const agentDeckSubject = (spacePath: string, agentId: string): string =>
  `${spacePath}/${SpaceSchema.SETTINGS_SECTION_ID}/${AGENTS_SECTION_ID}/${agentId}`;

/** Graph node type and data (the surface literal) of the debug panel's page inspecting the agents one administers. */
export const AGENTS_DEBUG_PAGE = 'org.dxos.plugin.agent.debug.agents';
