//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

export const DIAGRAM_APP_KEY = 'org.dxos.plugin.diagramApp';

/** Fired by the root before its first write: the types it creates (the root collection, drawings) are registered by then. */
export const Start = ActivationEvent.pluginStart(DIAGRAM_APP_KEY);
