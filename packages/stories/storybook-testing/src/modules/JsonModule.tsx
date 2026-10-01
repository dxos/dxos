//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Next } from '@dxos/react-ui/next';

/**
 * Generic JSON inspector module: renders the cell's bound `subject` as highlighted JSON. Bind data
 * from a layout via a surface cell — `{ type: ModuleRole.Json, data: { subject } }` — so a story can
 * inspect any live value beside its other modules.
 */
export const JsonModule = ({ data }: { data?: { subject?: unknown } }) => (
  <Next.Panel.Root>
    <Next.Panel.Body classNames='overflow-auto p-2 text-sm'>
      <JsonHighlighter data={data?.subject} />
    </Next.Panel.Body>
  </Next.Panel.Root>
);
