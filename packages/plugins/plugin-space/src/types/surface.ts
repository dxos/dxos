//
// Copyright 2026 DXOS.org
//

import { Surface } from '@dxos/app-framework/ui';
import { type Space } from '@dxos/react-client/echo';

/**
 * Surface role token for the Home article's scrollable content region. Contributors render
 * top-to-bottom (e.g. Welcome, Recent objects, starter-prompt cards).
 */
export const SpaceHomeContent: Surface.RoleToken<{ space: Space }> = Surface.makeType('space-home-content');

/**
 * Surface role token for the Home article's pinned-bottom region (the assistant prompt).
 * Rendered with `limit={1}` so only a single prompt contributor mounts.
 */
export const SpaceHomePinBottom: Surface.RoleToken<{ space: Space }> = Surface.makeType('space-home-pin-bottom');
