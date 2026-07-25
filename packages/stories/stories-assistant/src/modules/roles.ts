//
// Copyright 2026 DXOS.org
//

import { Role } from '@dxos/app-framework';

/** Custom roles for story panels that are NOT bound to a story-created object (harness chat, diagnostics). */
export const StoryRole = {
  Chat: Role.make<Record<string, any>>('org.dxos.storybook.role.chat'),
  Logging: Role.make<Record<string, any>>('org.dxos.storybook.role.logging'),
};
