//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, DEFAULT_TEST_TIMEOUT, getDefaultBlueprints } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('InboxBlueprintEnable', () => {
  it.effect(
    'enables the inbox blueprint and queries emails',
    agentTest(
      Prompt.make({
        instructions: trim`
          The database starts empty.

          First, create a Mailbox object in the space using the database blueprint tools (typename org.dxos.type.mailbox). Give it a clear name.

          Then enable the inbox blueprint (key: org.dxos.blueprint.inbox) using the blueprint manager.

          Call the ReadEmail operation (org.dxos.plugin.inbox.operation.read-email) for that mailbox. With no messages in the feed, it should return zero emails — the important part is that ReadEmail completes successfully, not the count.

          Completion criteria:
          - A Mailbox object exists in the database.
          - The inbox blueprint is successfully enabled, or you report the exact tool error if it cannot be enabled.
          - You have called [read-email] and it completes successfully.
        `,
        blueprints: getDefaultBlueprints(),
      }),
    ),
    { timeout: DEFAULT_TEST_TIMEOUT },
  );
});
