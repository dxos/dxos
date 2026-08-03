//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export namespace AssistantEvents {
  /**
   * The assistant feature's start event. Fired on demand (chat surfaces, toolkit
   * materialization, headless skill resolution) and by the host's idle trickle; assistant
   * modules and cross-plugin assistant contributions (skills) activate here. The id must equal
   * `AppActivationEvents.AssistantStart` (app-toolkit names it by key convention to avoid a package
   * cycle).
   */
  export const Start = ActivationEvent.pluginStart(meta.profile.key);
}
