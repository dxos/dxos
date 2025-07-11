//
// Copyright 2025 DXOS.org
//

import { ToolRegistry } from '@dxos/ai';
import { EXA_API_KEY } from '@dxos/ai/testing';
import { createExaTool, createGraphWriterTool, createLocalSearchTool } from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { SequenceParser, type SequenceDefinition } from '@dxos/conductor';
import { type DXN } from '@dxos/keys';
import { DataTypes } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

// TODO(dmaretskyi): make db available through services (same as function executor).
// TODO(burdon): Can tools implement "aspects" so that variants can be used rather than an explicit reference?
export const createToolRegistry = (space: Space, queueDxn?: DXN): ToolRegistry => {
  return new ToolRegistry(
    [
      createExaTool({ apiKey: EXA_API_KEY }),
      createLocalSearchTool(space.db, queueDxn && space.queues.get(queueDxn)),
      queueDxn &&
        createGraphWriterTool({
          db: space.db,
          queue: space.queues.get(queueDxn),
          schema: DataTypes,
          onDone: async (objects) => {
            const queue = space.queues.get(queueDxn);
            await queue.append(objects);
          },
        }),
    ].filter(isNonNullable),
  );
};

export const RESEARCH_SEQUENCE_DEFINITION: SequenceDefinition = {
  steps: [
    {
      instructions: 'Research information and entities related to the selected objects.',
      tools: ['search/web_search'],
    },
    {
      instructions:
        'Based on your research find matching entires that are already in the graph. Do exaustive research.',
      tools: ['search/local_search'],
    },
    {
      instructions: 'Add researched data to the graph. Make connections to existing objects.',
      tools: ['search/local_search', 'graph/writer'],
    },
  ],
};

export const RESEARCH_SEQUENCE = SequenceParser.create().parse(RESEARCH_SEQUENCE_DEFINITION);
