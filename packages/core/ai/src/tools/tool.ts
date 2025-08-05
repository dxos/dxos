//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

export const ToolId = Schema.String.pipe(Schema.brand('ToolId')).annotations({
  identifier: 'ToolId',
  name: 'ToolId',
  description: 'Unique identifier for a tool.',
});

export type ToolId = Schema.Schema.Type<typeof ToolId>;
