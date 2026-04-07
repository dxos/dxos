//
// Copyright 2025 DXOS.org
//

import { Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { type Client } from '@dxos/client';

import { AppCapabilities } from './capabilities';
import { getSpaceIdFromPath } from './paths';

export const getActiveWorkspace = (capabilities: CapabilityManager.CapabilityManager) => {
  const registry = capabilities.get(Capabilities.AtomRegistry);
  const layoutAtom = capabilities.get(AppCapabilities.Layout);
  const layout = registry.get(layoutAtom);
  return layout.workspace;
};

export const getActiveSpaceId = (workspace?: string) => (workspace ? getSpaceIdFromPath(workspace) : undefined);

export const getActiveSpace = (client: Client, capabilities: CapabilityManager.CapabilityManager) => {
  const spaceId = getActiveSpaceId(getActiveWorkspace(capabilities));
  return spaceId ? client.spaces.get(spaceId) : undefined;
};
