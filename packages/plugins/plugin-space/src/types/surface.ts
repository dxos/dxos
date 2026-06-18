//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

/**
 * Surface role token for the Home article's scrollable content region. Contributors render
 * top-to-bottom (e.g. Welcome, Recent objects, starter-prompt cards).
 */
export const SpaceHomeContent: Surface.RoleToken<{ space: Space }> = Surface.makeType(
  'org.dxos.plugin.space.role.homeContent',
);

/**
 * Surface role token for the Home article's pinned-bottom region (the assistant prompt).
 * Rendered with `limit={1}` so only a single prompt contributor mounts.
 */
export const SpaceHomePinBottom: Surface.RoleToken<{ space: Space }> = Surface.makeType(
  'org.dxos.plugin.space.role.homePinBottom',
);

/**
 * Parallel token for the assistant prompts slot (owned by plugin-assistant).
 * Same NSID as `Prompts` in plugin-assistant/src/roles.ts; no cross-package dep needed.
 */
export const Prompts: Surface.RoleToken<{ subject: Obj.Any; attendableId: string }> = Surface.makeType(
  'org.dxos.plugin.assistant.role.prompts',
);
