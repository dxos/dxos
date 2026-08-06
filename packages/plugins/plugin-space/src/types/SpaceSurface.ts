//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

/**
 * Surface role token for the Home article's scrollable content region. Contributors render
 * top-to-bottom (e.g. Welcome, Recent objects, starter-prompt cards).
 */
export const SpaceHomeContent: Role.Role<{ space: Space }> = Role.make('org.dxos.plugin.space.role.homeContent');

/**
 * Surface role token for the Home article's pinned-bottom region (the assistant prompt).
 * Rendered with `limit={1}` so only a single prompt contributor mounts.
 */
export const SpaceHomePinBottom: Role.Role<{ space: Space }> = Role.make('org.dxos.plugin.space.role.homePinBottom');

/**
 * Surface role token for assistant prompts (consumed by plugin-assistant).
 * Owned by plugin-space to avoid a circular dependency.
 */
export const Prompts: Role.Role<{ subject: Obj.Any; attendableId: string }> = Role.make(
  'org.dxos.plugin.assistant.role.prompts',
);
