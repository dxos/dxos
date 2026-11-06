//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { MeetingRecorderNamespace } from '../namespace.ts';

/** The feature's start event; fired on demand and by the host's idle trickle. */
export const Start = ActivationEvent.pluginStart(MeetingRecorderNamespace.key);
