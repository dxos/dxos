//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { type SequenceDefinition, SequenceParser } from '@dxos/conductor';

export const RESEARCH_SEQUENCE_DEFINITION: SequenceDefinition = {
  steps: [
    {
      instructions: 'Research information and entities related to the selected objects.',
      tools: [ToolId.make('search/web_search')],
    },
    {
      instructions:
        'Based on your research find matching entires that are already in the graph. Do exaustive research.',
      tools: [ToolId.make('search/local_search')],
    },
    {
      instructions: 'Add researched data to the graph. Make connections to existing objects.',
      tools: [ToolId.make('search/local_search'), ToolId.make('graph/writer')],
    },
  ],
};

export const RESEARCH_SEQUENCE = SequenceParser.create().parse(RESEARCH_SEQUENCE_DEFINITION);
