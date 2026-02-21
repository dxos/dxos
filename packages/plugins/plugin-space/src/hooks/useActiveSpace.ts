//
// Copyright 2025 DXOS.org
//

import { Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useSpace } from '@dxos/react-client/echo';

export const getActiveSpace = (capabilities: CapabilityManager.CapabilityManager) => {
  const client = capabilities.get(ClientCapabilities.Client);
  const registry = capabilities.get(Capabilities.AtomRegistry);
  const layoutAtom = capabilities.get(AppCapabilities.Layout);
  const layout = registry.get(layoutAtom);
  const { spaceId } = parseId(layout.workspace);
  return spaceId ? client.spaces.get(spaceId) : undefined;
};

export const useActiveSpace = () => {
  const layout = useLayout();
  const { spaceId } = parseId(layout.workspace);
  return useSpace(spaceId);
};
