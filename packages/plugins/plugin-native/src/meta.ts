//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import config from '../dx.config';

// TODO(wittjosiah): Rename plugin (package + id) from `native` to `app` to match the user-facing name.
export const meta = Plugin.getMetaFromConfig(config);
