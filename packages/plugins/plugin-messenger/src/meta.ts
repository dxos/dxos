//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import config from '../dx.config.ts';

export const meta = Plugin.getMetaFromConfig(config);

/** Deck companion variant (and surface role suffix) of the notifications panel. */
export const MESSENGER_COMPANION = 'messenger';
