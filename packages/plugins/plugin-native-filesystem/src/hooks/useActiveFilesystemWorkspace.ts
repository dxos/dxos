//
// Copyright 2025 DXOS.org
//

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { useLayout } from '@dxos/app-toolkit/ui';

import * as NativeFilesystemCapabilities from '../types/NativeFilesystemCapabilities';

/** Extracts the raw workspace id from a qualified graph path (e.g. `root/fs:dir` → `fs:dir`). */
const getWorkspaceId = (qualifiedPath: string): string => {
  const workspacePath = GraphPath.getWorkspaceFromPath(qualifiedPath);
  const separatorIndex = workspacePath.indexOf('/');
  return separatorIndex === -1 ? workspacePath : workspacePath.slice(separatorIndex + 1);
};

/** Returns the filesystem workspace matching the current layout workspace, if any. */
export const useActiveFilesystemWorkspace = (): NativeFilesystemCapabilities.FilesystemWorkspace | undefined => {
  const layout = useLayout();
  const [state] = useAtomCapabilityState(NativeFilesystemCapabilities.State);
  const workspaceId = getWorkspaceId(layout.workspace);
  return state.workspaces.find((ws) => ws.id === workspaceId);
};
