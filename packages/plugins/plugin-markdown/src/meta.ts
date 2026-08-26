//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

/**
 * Authored here rather than read from `dxplugin.jsonc`, because the descriptor is fetched over a URL
 * and this is needed synchronously: capability tags are built from `meta.profile.key` at module
 * scope. `meta.test.ts` fails if the two ever disagree.
 */
export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.markdown'),
  name: 'Markdown',
});
