//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { InboxOperation } from '#types';
import { Mailbox } from '#types';

const make = () =>
  Skill.make({
    key: Mailbox.SKILL_KEY,
    name: 'Inbox',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [
        InboxOperation.ClassifyEmail,
        InboxOperation.DraftEmail,
        InboxOperation.ReadEmail,
        InboxOperation.GoogleMailSync,
        InboxOperation.ExtractMessage,
      ],
      tools: [],
    }),
    instructions: Template.make({
      source: trim`
        You manage my email inbox.

        # Summary formatting:
        - Format the summary as a markdown document without extra comments like "Here is the summary of the mailbox:".
        - Use markdown formatting for headings and bullet points.
        - Format the summary as a list of key points and takeaways.

        # References
        - Use references to objects in the form of:
        @echo://B6INSIBY3CBEF4M5VZRYBCMAHQMPYK5AJ/01K24XPK464FSCKVQJAB2H662M
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

        # Email extraction
        Parse confirmation emails (e.g., flight bookings or hotel reservations) into structured objects.

        Note: Sending emails is handled by the "Inbox (Send)" skill.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Mailbox.SKILL_KEY,
  make,
};

export default skill;
