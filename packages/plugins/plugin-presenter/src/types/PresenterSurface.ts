//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';

import type * as Presentation from './Presentation.ts';

/** Items another plugin adds to a Presentation's toolbar, before the play button. */
export const Toolbar: Role.Role<{ subject: Presentation.Presentation }> = Role.make(
  'org.dxos.plugin.presenter.role.toolbar',
);

/** Content another plugin draws over a presented deck (a recording indicator, a timer). */
export const Overlay: Role.Role<{ subject: Presentation.Presentation }> = Role.make(
  'org.dxos.plugin.presenter.role.overlay',
);
