//
// Copyright 2026 DXOS.org
//

import React, { useId, useMemo } from 'react';

import { Panel, Toolbar } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { type ModuleProps } from '@dxos/story-modules';

/**
 * Diagnostic module that renders the space and attendable id the container injected.
 * Used to exercise the container's grid/surface wiring in isolation from any real plugin surface.
 */
export const TestModule = ({ space, attendableId }: ModuleProps) => {
  // Distinguishes each mounted instance within a multi-cell grid.
  const instanceId = useId();

  const data = useMemo(() => ({ instanceId, attendableId, space: space.id }), [instanceId, attendableId, space]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>TestModule {instanceId}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='p-2 min-h-0'>
        <Syntax.Root data={data}>
          <Syntax.Content>
            <Syntax.Viewport>
              <Syntax.Code classNames='text-xs' />
            </Syntax.Viewport>
          </Syntax.Content>
        </Syntax.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
