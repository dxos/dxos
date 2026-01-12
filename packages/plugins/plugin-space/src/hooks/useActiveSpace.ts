//
// Copyright 2025 DXOS.org
//

import { type Capability, Common } from '@dxos/app-framework';
import { useLayout } from '@dxos/app-framework/react';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useSpace } from '@dxos/react-client/echo';

export const getActiveSpace = (context: Capability.PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const layout = context.getCapability(Common.Capability.Layout);
  const { spaceId } = parseId(layout.workspace);
  return spaceId ? client.spaces.get(spaceId) : undefined;
};

export const useActiveSpace = () => {
  const layout = useLayout();
  const { spaceId } = parseId(layout.workspace);
  return useSpace(spaceId);
};
