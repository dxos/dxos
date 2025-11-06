//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext } from '@dxos/app-framework';
import { useLayout } from '@dxos/app-framework/react';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useSpace } from '@dxos/react-client/echo';

export const getActiveSpace = (context: PluginContext) => {
  const client = context.getCapability(ClientCapabilities.Client);
  const layout = context.getCapability(Capabilities.Layout);
  const { spaceId } = parseId(layout.workspace);
  return spaceId ? client.spaces.get(spaceId) : undefined;
};

export const useActiveSpace = () => {
  const layout = useLayout();
  const { spaceId } = parseId(layout.workspace);
  return useSpace(spaceId);
};
