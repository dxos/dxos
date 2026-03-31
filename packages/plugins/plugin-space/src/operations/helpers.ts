// Copyright 2025 DXOS.org

import { Capability } from '@dxos/app-framework';

export type SpaceOperationConfig = {
  createInvitationUrl: (invitationCode: string) => string;
  observability: boolean;
};

export const SpaceOperationConfig = Capability.make<SpaceOperationConfig>('org.dxos.plugin.space.operation-config');
