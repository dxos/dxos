//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import config from '../dx.config';

// TODO(wittjosiah): Rename plugin (package + id) from `native` to `app` to match the user-facing name.
export const meta = Plugin.getMetaFromConfig(config);
