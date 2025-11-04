//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DataType } from '@dxos/schema';

const blueprint: Blueprint.Blueprint = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/web-search',
  name: 'Web Search',
  description: 'Search the web.',
  instructions: {
    source: Ref.make(DataType.Text.make('')), // No instructions required.
  },
  tools: [ToolId.make('AnthropicWebSearch')],
});

export default blueprint;
