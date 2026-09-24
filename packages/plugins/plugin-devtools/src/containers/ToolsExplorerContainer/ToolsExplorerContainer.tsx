//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { EdgeServiceName } from '@dxos/config';
import { useEdgeServiceEndpoint } from '@dxos/react-client';
import { Panel } from '@dxos/react-ui';
import { ToolsExplorer } from '@dxos/react-ui-introspect';

/**
 * Binds the tools explorer to the introspect endpoint from config; the explorer renders its
 * unconfigured state when neither `runtime.services.edge.url` nor an `introspect` override is set.
 */
export const ToolsExplorerContainer = ({ role }: { role?: string }) => {
  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <ToolsExplorer serverUrl={useEdgeServiceEndpoint(EdgeServiceName.Introspect)} />
      </Panel.Content>
    </Panel.Root>
  );
};

ToolsExplorerContainer.displayName = 'ToolsExplorerContainer';
