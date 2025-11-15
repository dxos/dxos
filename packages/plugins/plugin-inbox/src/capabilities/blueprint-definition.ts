//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Blueprint, Template } from '@dxos/blueprints';
import { type FunctionDefinition } from '@dxos/functions';
import { trim } from '@dxos/util';

import { calendar, gmail, open, summarize } from '../functions';

export const INBOX_BLUEPRINT_KEY = 'dxos.org/blueprint/inbox';
export const CALENDAR_BLUEPRINT_KEY = 'dxos.org/blueprint/calendar';

const inboxFunctions: FunctionDefinition[] = [open, summarize, gmail.sync];
const calendarFunctions: FunctionDefinition[] = [calendar.sync];
const tools: string[] = [];

export default () => {
  return [
    contributes(Capabilities.Functions, inboxFunctions),
    contributes(Capabilities.Functions, calendarFunctions),
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: INBOX_BLUEPRINT_KEY,
        name: 'Inbox',
        tools: Blueprint.toolDefinitions({ functions: inboxFunctions, tools }),
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
      }),
    ),
    contributes(
      Capabilities.BlueprintDefinition,
      Blueprint.make({
        key: CALENDAR_BLUEPRINT_KEY,
        name: 'Calendar',
        tools: Blueprint.toolDefinitions({ functions: calendarFunctions, tools }),
        instructions: Template.make({
          source: trim`
              You manage my calendar.
            `,
        }),
      }),
    ),
  ];
};
