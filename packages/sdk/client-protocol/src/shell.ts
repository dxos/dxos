//
// Copyright 2023 DXOS.org
//

import { type Event } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import {
  type InvitationUrlRequest,
  type AppContextRequest,
  type LayoutRequest,
  type ShellLayout,
} from '@dxos/protocols/proto/dxos/iframe';

export interface ShellRuntime {
  layoutUpdate: Event<LayoutRequest>;
  invitationUrlUpdate: Event<InvitationUrlRequest>;
  layout: ShellLayout;
  invitationCode?: string;
  spaceKey?: PublicKey;
  target?: string;
  invitationUrl: string;
  deviceInvitationParam: string;
  spaceInvitationParam: string;
  setLayout: (request: LayoutRequest) => void;
  setInvitationUrl: (request: InvitationUrlRequest) => void;
  setAppContext: (context: AppContextRequest) => Promise<void>;
}
