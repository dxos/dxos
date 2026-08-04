//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { WorkspaceSettingsContainer } from '#containers';
import { useActiveFilesystemWorkspace } from '#hooks';

/** Resolves the active workspace from context; renders nothing until one is selected. */
export const WorkspaceSettingsSurface = () => {
  const workspace = useActiveFilesystemWorkspace();
  if (!workspace) {
    return null;
  }

  return <WorkspaceSettingsContainer workspace={workspace} />;
};
