//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { AppContextRequest, LayoutRequest, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';

export interface ShellRuntime {
  layoutUpdate: Event<LayoutRequest>;
  layout: ShellLayout;
  invitationCode?: string;
  spaceKey?: PublicKey;
  setLayout: (layout: ShellLayout, options?: Omit<LayoutRequest, 'layout'>) => void;
  setAppContext: (context: AppContextRequest) => Promise<void>;
}
