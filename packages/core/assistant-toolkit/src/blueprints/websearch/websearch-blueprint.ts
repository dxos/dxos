//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

const blueprint: Blueprint.Blueprint = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/web-search',
  name: 'Web Search',
  description: 'Search the web.',
  instructions: {
    source: Ref.make(Text.make()),
  },
  tools: [ToolId.make('AnthropicWebSearch')],
});

export default blueprint;
