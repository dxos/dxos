//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { EdgeServiceName } from '@dxos/config';
import { useEdgeServiceEndpoint } from '@dxos/react-client';
import { ToolsExplorer } from '@dxos/react-ui-introspect';

/**
 * Binds the tools explorer to the introspect endpoint from config; the explorer renders its
 * unconfigured state when `runtime.services.edgeServices` has no `introspect` entry.
 */
export const ToolsExplorerContainer = () => {
  return <ToolsExplorer serverUrl={useEdgeServiceEndpoint(EdgeServiceName.Introspect)} />;
};

ToolsExplorerContainer.displayName = 'ToolsExplorerContainer';
