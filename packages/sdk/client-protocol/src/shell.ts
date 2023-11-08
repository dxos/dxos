//
// Copyright 2023 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type AppContextRequest, type LayoutRequest, type ShellLayout } from '@dxos/protocols/proto/dxos/iframe';

export interface ShellRuntime {
  layoutUpdate: Event<LayoutRequest>;
  layout: ShellLayout;
  invitationCode?: string;
  spaceKey?: PublicKey;
  setLayout: (request: LayoutRequest) => void;
  setAppContext: (context: AppContextRequest) => Promise<void>;
}
