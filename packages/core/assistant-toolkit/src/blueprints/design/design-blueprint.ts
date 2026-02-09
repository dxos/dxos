//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Document } from '../../functions';

const instructions = trim`
  You manage a design spec based on the conversation.
  The design spec is a markdown document that is used to record the tasks.
  The design spec document follows a hierarchical structure, with nested markdown bulleted sections.
  Use the appropriate tools to read and write the design spec document.
  Maintain the document so that it can convey all relevant points from the conversation.
  When replying to the user, be terse with your comments about design doc handling.
  Do not announce when you read or write the design spec document.
`;

export const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/design',
  name: 'Design Spec',
  description: 'Preserve the conversation in the design spec.',
  instructions: {
    source: Ref.make(Text.make(instructions)),
  },
  tools: [Document.read, Document.update].map((fn) => ToolId.make(fn.key)),
});
