//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';

/**
 * Virtual `#meta` module. The runtime value is synthesized from this package's
 * `dx.yml` (`package.plugins[0]`) at build time — see the dx-compile
 * `pluginMetaPlugin`. This declaration provides the type for
 * `import { meta } from '#meta'`.
 */
export const meta: Plugin.Meta;
