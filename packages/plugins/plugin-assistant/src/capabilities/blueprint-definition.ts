//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { context } from '../functions';
import { ToolId } from '@dxos/ai';

export default () => {
  return contributes(
    Capabilities.BlueprintDefinition,
    Blueprint.make({
      key: 'dxos.org/blueprint/assistant',
      name: 'Assistant',
      instructions: {
        // TODO(burdon): This should be the system prompt for the assistant?
        source: trim`          
          You are a helpful assistant.
        `,
      },
      tools: [ToolId.make(context.name)],
    }),
  );
};
