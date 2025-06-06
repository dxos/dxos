//
// Copyright 2025 DXOS.org
//

import { Capabilities, useLayout, type PluginContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useSpace } from '@dxos/react-client/echo';

export const getActiveSpace = (context: PluginContext) => {
  const layout = context.getCapability(Capabilities.Layout);
  const client = context.getCapability(ClientCapabilities.Client);
  const { spaceId } = parseId(layout.workspace);
  return spaceId ? client.spaces.get(spaceId) : undefined;
};

export const useActiveSpace = () => {
  const layout = useLayout();
  const { spaceId } = parseId(layout.workspace);
  return useSpace(spaceId);
};
