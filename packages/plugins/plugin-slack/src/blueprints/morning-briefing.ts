//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const MORNING_BRIEFING_KEY = 'org.dxos.blueprint.morning-briefing';

// Tool keys from plugin-inbox operations (referenced by key to avoid Vite import resolution issues).
const INBOX_TOOLS = [
  'org.dxos.plugin.inbox.operation.read-email',
  'org.dxos.plugin.inbox.operation.summarize-mailbox',
  'org.dxos.plugin.inbox.operation.google-mail-sync',
  'org.dxos.plugin.inbox.operation.google-calendar-sync',
];

const make = () =>
  Blueprint.make({
    key: MORNING_BRIEFING_KEY,
    name: 'Morning Briefing',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [],
      tools: INBOX_TOOLS,
    }),
    instructions: Template.make({
      source: trim`
        {{! Morning Briefing }}

        You are a personal executive assistant generating a morning briefing.
        You have tools to read emails and sync calendars.

        # Process

        1. First, sync the mailbox to get latest emails (use google-mail-sync).
        2. Then, sync the calendar to get today's events (use google-calendar-sync).
        3. Read the latest emails (use read-email).
        4. Synthesize everything into a structured briefing.

        # Briefing Structure

        ## Today's Schedule
        List today's calendar events chronologically with:
        - Time and duration
        - Event name and key attendees
        - One-line context (why this meeting matters)

        ## Email Highlights
        Summarize the most important unread emails:
        - **Urgent**: Requires response within the hour
        - **Action Required**: Needs a response or action today
        - **FYI**: Important to know but no action needed
        Group by priority, not chronologically.

        ## Action Items
        A consolidated, prioritized list of everything that needs attention today:
        - [ ] Action item with source (email/calendar/Slack)
        Format as markdown checkboxes.

        ## Quick Stats
        - Unread emails: count
        - Meetings today: count
        - Pending action items: count

        # Formatting Rules
        - Be concise — this is a 2-minute read, not a novel
        - Lead with what matters most
        - Include references to source objects where possible
        - Use markdown formatting
        - Don't include greetings or sign-offs — get straight to the content
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: MORNING_BRIEFING_KEY,
  make,
};

export default blueprint;
