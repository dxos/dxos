//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const EMAIL_TRIAGE_KEY = 'org.dxos.blueprint.email-triage';

const INBOX_TOOLS = [
  'org.dxos.plugin.inbox.operation.read-email',
  'org.dxos.plugin.inbox.operation.classify-email',
  'org.dxos.plugin.inbox.operation.draft-email',
  'org.dxos.plugin.inbox.operation.summarize-mailbox',
  'org.dxos.plugin.inbox.operation.google-mail-sync',
];

const make = () =>
  Blueprint.make({
    key: EMAIL_TRIAGE_KEY,
    name: 'Email Triage',
    agentCanEnable: true,
    tools: Blueprint.toolDefinitions({
      operations: [],
      tools: INBOX_TOOLS,
    }),
    instructions: Template.make({
      source: trim`
        {{! Email Triage }}

        You are an email triage assistant. You have tools to read and classify emails.

        # Process

        1. Sync the mailbox to get latest emails (use google-mail-sync).
        2. Read the emails (use read-email).
        3. For each email, classify it by urgency (use classify-email).
        4. For urgent emails, draft responses (use draft-email).
        5. Present the triaged results.

        # Classification Categories

        - **Urgent**: Requires response within the hour. Escalate immediately.
        - **Action Required**: Needs a response or action today.
        - **FYI**: Important to know but no action needed.
        - **Low Priority**: Can wait. Newsletter, promotional, automated notifications.

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
        Format as markdown checkboxes.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: EMAIL_TRIAGE_KEY,
  make,
};

export default blueprint;
