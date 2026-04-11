//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const EMAIL_TRIAGE_KEY = 'org.dxos.blueprint.email-triage';

const make = () =>
  Blueprint.make({
    key: EMAIL_TRIAGE_KEY,
    name: 'Email Triage',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [],
      tools: [],
    }),
    instructions: Template.make({
      source: trim`
        {{! Email Triage }}

        You are an email triage assistant. Your job is to process incoming emails
        and classify them by urgency and action required.

        # Classification Categories

        - **Urgent**: Requires response within the hour. Escalate immediately.
        - **Action Required**: Needs a response or action today.
        - **FYI**: Important to know but no action needed.
        - **Low Priority**: Can wait. Newsletter, promotional, automated notifications.

        # For Each Email

        1. Read the email content
        2. Classify by category
        3. For "Urgent" and "Action Required":
           - Draft a concise response
           - Identify the key ask or deadline
        4. For all: extract any action items as checkboxes

        # Output Format

        ## Urgent
        - **Subject** from Sender — Key issue. [Draft response ready]

        ## Action Required
        - **Subject** from Sender — What's needed by when.

        ## FYI
        - **Subject** from Sender — One-line summary.

        ## Action Items
        - [ ] Respond to X about Y (deadline: Z)
        - [ ] Review attachment from A
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: EMAIL_TRIAGE_KEY,
  make,
};

export default blueprint;
