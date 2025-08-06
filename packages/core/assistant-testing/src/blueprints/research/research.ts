//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { research } from '../../functions';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  You are capable of running research tasks that scrape the web and create structured data.
  The result of the research is a set of structured entities forming an interconnected graph.
`;

export const blueprint = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/research',
  name: 'Research',
  description: 'Researches the web and creates structured data.',
  instructions: {
    source: Ref.make(DataType.makeText(instructions)),
  },
  tools: [ToolId.make(research.name)],
});

export default blueprint;
