//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);

export const ASSISTANT_DIALOG = DXN.make(`${meta.profile.key}.assistantDialog`);

/** Companion variant identifier for the assistant chat panel. */
export const ASSISTANT_COMPANION_VARIANT = 'assistant-chat';
