//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { EdgeServiceName } from '@dxos/config';
import { useEdgeServiceEndpoint } from '@dxos/react-client';
import { Next } from '@dxos/react-ui';
import { ToolsExplorer } from '@dxos/react-ui-introspect';

/**
 * Binds the tools explorer to the introspect endpoint from config; the explorer renders its
 * unconfigured state when neither `runtime.services.edge.url` nor an `introspect` override is set.
 */
export const ToolsExplorerContainer = ({ role }: { role?: string }) => {
  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body>
        <ToolsExplorer serverUrl={useEdgeServiceEndpoint(EdgeServiceName.Introspect)} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

ToolsExplorerContainer.displayName = 'ToolsExplorerContainer';
