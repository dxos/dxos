//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

/*
Re-run test with ALLOW_LLM_GENERATION=1 to generate a new memoized conversation.
Closest match: Index: conversation
===================================================================
--- conversation saved
+++ conversation new
@@ -4015,9 +4015,9 @@
                 "message": "Organization 'Cyberdyne Systems' was successfully created and confirmed via database query.",
                 "name": "Cyberdyne Systems",
                 "organizationId": "01JGFJJZ00G0WKQSJGMAKCNTDR",
                 "typename": "org.dxos.type.organization",
-                "uri": "echo://<memoized-dynamic-0>/01JGFJJZ00G0WKQSJGMAKCNTDR"
+                "uri": "echo://<memoized-dynamic-1>/01JGFJJZ00G0WKQSJGMAKCNTDR"
               }
             },
             "providerExecuted": false,
             "type": "tool-call",

*/
// TODO(dmaretskyi): Fix memoization issue.
describe.skip('Database', () => {
  it.effect(
    'create and query',
    agentTest({
      instructions: trim`
        Create a new organization called "Cyberdyne Systems".
        Query the database to confirm that the organization is created and the query tool is working.
      `,
    }),
    { timeout: agentTestTimeout() },
  );
});
