//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export namespace TypeSafeEvents {
  /** The feature's start event, gating this plugin's start-activated modules. */
  export const Start = ActivationEvent.pluginStart(meta.profile.key);
}
