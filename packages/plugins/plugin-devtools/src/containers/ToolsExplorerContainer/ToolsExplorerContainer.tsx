//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { useConfig } from '@dxos/react-client';
import { ToolsExplorer } from '@dxos/react-ui-introspect';

/**
 * Binds the tools explorer to the introspect endpoint from config; the explorer renders its
 * unconfigured state when `runtime.services.edgeServices` has no `introspect` entry.
 */
export const ToolsExplorerContainer = () => {
  const config = useConfig();
  return <ToolsExplorer serverUrl={getEdgeServiceEndpoint(config, EdgeServiceName.Introspect)} />;
};

ToolsExplorerContainer.displayName = 'ToolsExplorerContainer';
