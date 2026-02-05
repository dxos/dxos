//
// Copyright 2025 DXOS.org
//

import { type CapabilityManager, Common } from '@dxos/app-framework';
import { useLayout } from '@dxos/app-framework/react';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useSpace } from '@dxos/react-client/echo';

export const getActiveSpace = (capabilities: CapabilityManager.CapabilityManager) => {
  const client = capabilities.get(ClientCapabilities.Client);
  const registry = capabilities.get(Common.Capability.AtomRegistry);
  const layoutAtom = capabilities.get(Common.Capability.Layout);
  const layout = registry.get(layoutAtom);
  const { spaceId } = parseId(layout.workspace);
  return spaceId ? client.spaces.get(spaceId) : undefined;
};

export const useActiveSpace = () => {
  const layout = useLayout();
  const { spaceId } = parseId(layout.workspace);
  return useSpace(spaceId);
};
