//
// Copyright 2025 DXOS.org
//

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { getWorkspaceFromPath } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';

import { NativeFilesystemCapabilities, type FilesystemWorkspace } from '../types';

/** Extracts the raw workspace id from a qualified graph path (e.g. `root/fs:dir` → `fs:dir`). */
const getWorkspaceId = (qualifiedPath: string): string => {
  const workspacePath = getWorkspaceFromPath(qualifiedPath);
  const separatorIndex = workspacePath.indexOf('/');
  return separatorIndex === -1 ? workspacePath : workspacePath.slice(separatorIndex + 1);
};

/** Returns the filesystem workspace matching the current layout workspace, if any. */
export const useActiveFilesystemWorkspace = (): FilesystemWorkspace | undefined => {
  const layout = useLayout();
  const [state] = useAtomCapabilityState(NativeFilesystemCapabilities.State);
  const workspaceId = getWorkspaceId(layout.workspace);
  return state.workspaces.find((ws) => ws.id === workspaceId);
};
