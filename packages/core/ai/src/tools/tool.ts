//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

export const ToolId = Schema.String.pipe(Schema.brand('ToolId')).annotations({
  identifier: 'ToolId',
  name: 'ToolId',
  description: 'Unique identifier for a tool.',
});

export type ToolId = Schema.Schema.Type<typeof ToolId>;
