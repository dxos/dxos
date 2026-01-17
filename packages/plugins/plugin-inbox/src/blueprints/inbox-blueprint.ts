//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { gmail, open, summarize } from '../functions';

export const Key = 'dxos.org/blueprint/inbox';

export const functions: FunctionDefinition[] = [open, summarize, gmail.sync, gmail.send];
export const tools: string[] = [];

export const make = () =>
  Blueprint.make({
    key: Key,
    name: 'Inbox',
    tools: Blueprint.toolDefinitions({ functions, tools }),
    instructions: Template.make({
      source: trim`
        You manage my email inbox.

        # Summary formatting:
        - Format the summary as a markdown document without extra comments like "Here is the summary of the mailbox:".
        - Use markdown formatting for headings and bullet points.
        - Format the summary as a list of key points and takeaways.

        # References
        - Use references to objects in the form of:
        @dxn:queue:data:B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ:01K24XMVHSZHS97SG1VTVQDM5Z:01K24XPK464FSCKVQJAB2H662M
        - References are rendered as rich content in the response to the user.

        # Tasks
        At the end of the summary include tasks.
        Extract only the tasks that are:
        - Directly actionable.
        - Clearly assigned to a person or team (or can easily be inferred).
        - Strongly implied by the conversation and/or user note (no speculative tasks).
        - Specific enough that someone reading them would know exactly what to do next.

        Format all tasks as markdown checkboxes using the syntax:
        - [ ] Task description.

        Additional information can be included (indented).
      `,
    }),
  });
