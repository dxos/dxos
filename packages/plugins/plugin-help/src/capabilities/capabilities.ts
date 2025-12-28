//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

export namespace HelpCapabilities {
  export type State = { running: boolean; showHints: boolean; showWelcome: boolean };
  export const State = Capability.make<Readonly<State>>(`${meta.id}/capability/state`);
  export const MutableState = Capability.make<State>(`${meta.id}/capability/state`);
}
