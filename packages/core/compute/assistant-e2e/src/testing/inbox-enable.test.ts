//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

// TODO(dmaretskyi): inbox skill (org.dxos.skill.inbox) could not be enabled and ReadEmail could not be called.: {"description":"Step 1 succeeded: A Mailbox object was created successfully in the database (id: 01JGFJJZ00G0WKQSJGMAKCNTHF, typename: org.dxos.type.mailbox, name: 'Test Mailbox').\n\nStep 2 failed: Attempted to enableskill with key 'org.dxos.skill.inbox' using enable-skills. The tool returned: {\"enabled\":[], \"rejected\":[{\"key\":\"org.dxos.skill.inbox\", \"reason\":\"Skill not found in registry.\"}]}. After calling refresh-skills and query-skills again, the skill still does not exist. The available skill keys are: org.dxos.skill.agent, org.dxos.skill.agent-wizard, org.dxos.skill.assistant, org.dxos.skill.skill-manager, org.dxos.skill.browser, org.dxos.skill.database, org.dxos.skill.discord, org.dxos.skill.linear, org.dxos.skill.memory, org.dxos.skill.planning, dxos.org/skill/automation, org.dxos.skill.web-search. None of these is an inbox skill.\n\nStep 3 failed: Without the inbox skill enabled, no read-email tool is available, so ReadEmail (org.dxos.plugin.inbox.operation.readEmail) cannot be called."}
describe.skip('InboxSkillEnable', () => {
  it.effect(
    'enables the inbox skill and queries emails',
    agentTest({
      instructions: trim`
        The database starts empty.
        First, create a Mailbox object in the space using the database skill tools (typename org.dxos.type.mailbox). Give it a clear name.
        Then enable the inbox skill (key: org.dxos.skill.inbox) using the skill manager.
        Call the ReadEmail operation (org.dxos.plugin.inbox.operation.readEmail) for that mailbox. With no messages in the feed, it should return zero emails — the important part is that ReadEmail completes successfully, not the count.
      `,
      completionCriteria: [
        'A Mailbox object exists in the database.',
        'The inbox skill is successfully enabled, or you report the exact tool error if it cannot be enabled.',
        'You have called [read-email] and it completes successfully.',
      ],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
