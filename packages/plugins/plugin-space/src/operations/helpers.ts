// Copyright 2025 DXOS.org

import * as Capability from '@dxos/app-framework/Capability';

export type SpaceOperationConfig = {
  createInvitationUrl: (invitationCode: string) => string;
  observability: boolean;
};

export const SpaceOperationConfig = Capability.makeSingleton<SpaceOperationConfig>()(
  'org.dxos.plugin.space.operationConfig',
);
