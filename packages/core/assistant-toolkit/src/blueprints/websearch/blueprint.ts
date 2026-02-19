//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

export const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/web-search',
  name: 'Web Search',
  description: 'Search the web.',
  instructions: {
    source: Ref.make(Text.make()),
  },
  tools: [ToolId.make('AnthropicWebSearch')],
});
