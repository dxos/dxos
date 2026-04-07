//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CompanionChatProvisioner = Capability.lazy(
  'CompanionChatProvisioner',
  () => import('./companion-chat-provisioner'),
);
