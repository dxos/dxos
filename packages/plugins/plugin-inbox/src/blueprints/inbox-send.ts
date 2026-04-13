//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { InboxOperation } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.inbox-send';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Inbox (Send)',
    tools: Blueprint.toolDefinitions({ operations: [InboxOperation.GmailSend], tools: [] }),
    instructions: Template.make({
      source: trim`
        You can send emails.

        There are more inbox-related tools in the "Inbox" blueprint.
        This blueprint is meant to be used in conjunction with the "Inbox" blueprint.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
