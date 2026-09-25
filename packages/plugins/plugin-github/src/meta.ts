//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import config from '../dx.config.ts';

export const meta = Plugin.getMetaFromConfig(config);

/** The dialog behind the "Import pull request" command. */
export const IMPORT_PULL_REQUEST_DIALOG = DXN.make(`${meta.profile.key}.importPullRequestDialog`);
