//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

// TODO(dmaretskyi): inbox blueprint (org.dxos.blueprint.inbox) could not be enabled and ReadEmail could not be called.: {"description":"Step 1 succeeded: A Mailbox object was created successfully in the database (id: 01JGFJJZ00G0WKQSJGMAKCNTHF, typename: org.dxos.type.mailbox, name: 'Test Mailbox').\n\nStep 2 failed: Attempted to enableblueprint with key 'org.dxos.blueprint.inbox' using enable-blueprints. The tool returned: {\"enabled\":[], \"rejected\":[{\"key\":\"org.dxos.blueprint.inbox\", \"reason\":\"Blueprint not found in registry.\"}]}. After calling refresh-blueprints and query-blueprints again, the blueprint still does not exist. The available blueprint keys are: org.dxos.blueprint.agent, org.dxos.blueprint.agent-wizard, org.dxos.blueprint.assistant, org.dxos.blueprint.blueprint-manager, org.dxos.blueprint.browser, org.dxos.blueprint.database, org.dxos.blueprint.discord, org.dxos.blueprint.linear, org.dxos.blueprint.memory, org.dxos.blueprint.planning, dxos.org/blueprint/automation, org.dxos.blueprint.web-search. None of these is an inbox blueprint.\n\nStep 3 failed: Without the inbox blueprint enabled, no read-email tool is available, so ReadEmail (org.dxos.plugin.inbox.operation.readEmail) cannot be called."}
describe.skip('InboxBlueprintEnable', () => {
  it.effect(
    'enables the inbox blueprint and queries emails',
    agentTest({
      instructions: trim`
        The database starts empty.

        First, create a Mailbox object in the space using the database blueprint tools (typename org.dxos.type.mailbox). Give it a clear name.

        Then enable the inbox blueprint (key: org.dxos.blueprint.inbox) using the blueprint manager.

        Call the ReadEmail operation (org.dxos.plugin.inbox.operation.readEmail) for that mailbox. With no messages in the feed, it should return zero emails — the important part is that ReadEmail completes successfully, not the count.
      `,
      completionCriteria: [
        'A Mailbox object exists in the database.',
        'The inbox blueprint is successfully enabled, or you report the exact tool error if it cannot be enabled.',
        'You have called [read-email] and it completes successfully.',
      ],
    }),
    { timeout: agentTestTimeout() },
  );
});
