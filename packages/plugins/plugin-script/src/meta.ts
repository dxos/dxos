//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);

// TODO(ZaymonFC): Configure by scopes?
export const defaultScriptsForIntegration: Record<string, string[]> = {
  // TODO(wittjosiah): Also include content extraction scripts in the default set.
  'gmail.com': [DXN.make('org.dxos.script.gmail')],
};
