//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { EdgeServiceName } from '@dxos/config';
import { useEdgeServiceEndpoint } from '@dxos/react-client';
import { ToolsExplorer } from '@dxos/react-ui-introspect';
import * as Panel from '@dxos/react-ui/Panel';

/**
 * Binds the tools explorer to the introspect endpoint from config; the explorer renders its
 * unconfigured state when neither `runtime.services.edge.url` nor an `introspect` override is set.
 */
export const ToolsExplorerContainer = ({ role }: { role?: string }) => {
  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <ToolsExplorer serverUrl={useEdgeServiceEndpoint(EdgeServiceName.Introspect)} />
      </Panel.Body>
    </Panel.Root>
  );
};

ToolsExplorerContainer.displayName = 'ToolsExplorerContainer';
