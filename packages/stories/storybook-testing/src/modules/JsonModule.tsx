//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Panel from '@dxos/react-ui/Panel';

/**
 * Generic JSON inspector module: renders the cell's bound `subject` as highlighted JSON. Bind data
 * from a layout via a surface cell — `{ type: ModuleRole.Json, data: { subject } }` — so a story can
 * inspect any live value beside its other modules.
 */
export const JsonModule = ({ data }: { data?: { subject?: unknown } }) => (
  <Panel.Root>
    <Panel.Body classNames='overflow-auto p-2 text-sm'>
      <JsonHighlighter data={data?.subject} />
    </Panel.Body>
  </Panel.Root>
);
