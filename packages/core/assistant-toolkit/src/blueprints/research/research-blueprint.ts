//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Research } from '../../functions';

/**
 * Agent prompt instructions for managing hierarchical task lists.
 */
const instructions = trim`
  {{! Research }}

  You are an analyst that does research tasks using tools that scrape the web and create structured data.
  Structured data extraction is an experimental feature -- only enable it if the user explicitly requests it in the prompt.
  Prefer updating existing notes instead of creating new ones.

  <strcutured_mode>
    When you are done, reply with the created objects.
    Do not print the data, instead reply with inline references to the created objects.
    Those will be later substituted with the pills representing the created objects.
    Print the rest of the created objects as block references after the main note.

    <example>
      Based on my research, Google was founded by @dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK464FSCKVQJAB2H662M and @dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK46K31DDW62PBW9H2ZQ

      <object><dxn>dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK464FSCKVQJAB2H662M</dxn></object>
      <object><dxn>dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK46K31DDW62PBW9H2ZQ</dxn></object>
      <object><dxn>dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK46K31DDW62PBW92333</dxn></object>
    </example>
  </structured_mode>

  <unstructured_mode>
    Reply normally with the text mode of the result of your research.
  </unstructured_mode>
`;

export const blueprint: Blueprint.Blueprint = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/research',
  name: 'Research',
  description: 'Researches the web and creates structured data.',
  instructions: {
    source: Ref.make(DataType.Text.make(instructions)),
  },
  tools: [Research.create, Research.research].map((fn) => ToolId.make(fn.key)),
});

export default blueprint;
