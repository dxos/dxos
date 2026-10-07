//
// Copyright 2025 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';

import { FileSystemCapabilities } from '#types';

/** Extracts the raw workspace id from a qualified graph path (e.g. `root/fs:dir` → `fs:dir`). */
const getWorkspaceId = (qualifiedPath: string): string => {
  const workspacePath = GraphPath.getWorkspaceFromPath(qualifiedPath);
  const separatorIndex = workspacePath.indexOf('/');
  return separatorIndex === -1 ? workspacePath : workspacePath.slice(separatorIndex + 1);
};

/** Returns the filesystem workspace matching the current layout workspace, if any. */
export const useActiveFileSystemWorkspace = (): FileSystemCapabilities.FileSystemWorkspace | undefined => {
  const layout = ToolkitHooks.useLayout();
  const [state] = Hooks.useAtomCapabilityState(FileSystemCapabilities.State);
  const workspaceId = getWorkspaceId(layout.workspace);
  return state.workspaces.find((ws) => ws.id === workspaceId);
};
