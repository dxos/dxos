//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { DiagramAppNamespace } from '../namespace.ts';

/** Fired by the root before its first write: the types it creates (the root collection, drawings) are registered by then. */
export const Start = ActivationEvent.pluginStart(DiagramAppNamespace.key);
