//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { RecorderNamespace } from '../namespace.ts';

/** The feature's start event, fired when one of the plugin's surfaces first renders. */
export const Start = ActivationEvent.pluginStart(RecorderNamespace.key);
