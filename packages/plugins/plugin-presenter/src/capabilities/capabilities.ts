//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { PRESENTER_PLUGIN } from '../meta';

export namespace PresenterCapabilities {
  export type State = { presenting: boolean };
  export const State = defineCapability<Readonly<State>>(`${PRESENTER_PLUGIN}/capability/state`);
  export const MutableState = defineCapability<State>(`${PRESENTER_PLUGIN}/capability/state`);
}
