//
// Copyright 2026 DXOS.org
//

import React, { useId, useMemo } from 'react';

import { Panel, Toolbar } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

import { type ModuleProps } from './types';

/**
 * Diagnostic module that renders the JSON form of the props it receives from `ModuleContainer`.
 * Used to exercise the container's layout/wiring in isolation from any real plugin surface.
 */
export const TestModule = ({ space, ...rest }: ModuleProps) => {
  // Distinguishes each mounted instance within a multi-cell grid.
  const instanceId = useId();

  // The `space` proxy and callbacks are not JSON-representable, so reduce them to a plain object.
  const data = useMemo(
    () => ({
      space: space?.id,
      ...Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [key, typeof value === 'function' ? '[Function]' : value]),
      ),
    }),
    [space, rest],
  );

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
