//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/echo';

/**
 * Stands in for plugin-projects in stories: the studio plugin declares it in `dependsOn`, so the
 * manager refuses to enable the studio without a plugin of that id — and the real one drags in
 * Tasks and the assistant, none of which an article story exercises. No modules: nothing here
 * contributes, the id alone satisfies the dependency walk.
 */
export const StubProjectsPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.projects'), name: 'Projects (stub)' }),
).pipe(Plugin.make);
