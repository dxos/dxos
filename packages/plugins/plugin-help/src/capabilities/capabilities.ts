//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { meta } from '../meta';

export namespace HelpCapabilities {
  export type State = { running: boolean; showHints: boolean; showWelcome: boolean };
  export const State = defineCapability<Readonly<State>>(`${meta.id}/capability/state`);
  export const MutableState = defineCapability<State>(`${meta.id}/capability/state`);
}
