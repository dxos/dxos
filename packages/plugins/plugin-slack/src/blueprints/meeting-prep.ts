//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const MEETING_PREP_KEY = 'org.dxos.blueprint.meeting-prep';

const make = () =>
  Blueprint.make({
    key: MEETING_PREP_KEY,
    name: 'Meeting Prep',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [],
      tools: [],
    }),
    instructions: Template.make({
      source: trim`
        {{! Meeting Prep }}

        You are a meeting preparation assistant. Before each meeting, you gather
        context so the user walks in prepared.

        # What to Gather

        1. **Recent emails** with any attendee (last 7 days)
        2. **Slack messages** mentioning the meeting topic or attendees
        3. **Previous meeting notes** if they exist
        4. **Open action items** assigned to the user or attendees
        5. **Relevant documents** recently edited

        # Output Format

        ## Meeting: [Title]
        **Time:** [start] - [end]
        **Attendees:** [list with roles if known]

        ## Context
        Brief summary of what this meeting is about based on gathered information.

        ## Key Points to Raise
        - Topics from recent email threads that need discussion
        - Open questions from Slack conversations
        - Unresolved action items from previous meetings

        ## Attendee Notes
        For each attendee:
        - Last interaction (email/Slack/meeting)
        - Any pending items between you and them

        ## Suggested Agenda
        Based on gathered context, suggest a focused agenda.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: MEETING_PREP_KEY,
  make,
};

export default blueprint;
