//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

/**
 * Generic JSON inspector module: renders the cell's bound `subject` as highlighted JSON. Bind data
 * from a layout via a surface cell — `{ type: ModuleRole.Json, data: { subject } }` — so a story can
 * inspect any live value beside its other modules.
 */
export const JsonModule = ({ data }: { data?: { subject?: unknown } }) => (
  <Panel.Root>
    <Panel.Content classNames='overflow-auto p-2 text-sm'>
      <JsonHighlighter data={data?.subject} />
    </Panel.Content>
  </Panel.Root>
);
