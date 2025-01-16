//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { HELP_PLUGIN } from '../meta';

export namespace HelpCapabilities {
  export type State = { running: boolean; showHints: boolean; showWelcome: boolean };
  export const State = defineCapability<Readonly<State>>(`${HELP_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<State>(`${HELP_PLUGIN}/capability/state`);
}
