//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const MEETING_PREP_KEY = 'org.dxos.blueprint.meeting-prep';

const INBOX_TOOLS = [
  'org.dxos.plugin.inbox.operation.read-email',
  'org.dxos.plugin.inbox.operation.summarize-mailbox',
  'org.dxos.plugin.inbox.operation.google-calendar-sync',
];

const make = () =>
  Blueprint.make({
    key: MEETING_PREP_KEY,
    name: 'Meeting Prep',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [],
      tools: INBOX_TOOLS,
    }),
    instructions: Template.make({
      source: trim`
        {{! Meeting Prep }}

        You are a meeting preparation assistant. You have tools to read emails and check the calendar.

        # Process

        1. Sync the calendar to get the latest events (use google-calendar-sync).
        2. Identify the next upcoming meeting.
        3. Read recent emails to find context related to the meeting attendees and topic (use read-email).
        4. Synthesize a preparation brief.

        # Output Format

        ## Meeting: [Title]
        **Time:** [start] - [end]
        **Attendees:** [list with roles if known]

        ## Context
        Brief summary of what this meeting is about based on gathered information.

        ## Key Points to Raise
        - Topics from recent email threads that need discussion
        - Open questions from conversations
        - Unresolved action items from previous interactions

        ## Attendee Notes
        For each attendee:
        - Last interaction (email subject and date)
        - Any pending items between you and them

        ## Suggested Agenda
        Based on gathered context, suggest a focused agenda.

        # Rules
        - If no upcoming meeting is found, say so clearly
        - Focus on actionable preparation, not summaries of obvious information
        - Keep it scannable — this is read 5 minutes before the meeting
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: MEETING_PREP_KEY,
  make,
};

export default blueprint;
