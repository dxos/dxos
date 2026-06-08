//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

// TODO(burdon): Re-enable + regenerate web.conversations.json. The DatabaseBlueprint serializes the
//   space's registered schemas (incl. @dxos/types Event) into the agent prompt, so the Event schema
//   change (location/allDay) invalidated this fixture. Regeneration requires the live web-search tool
//   (org.dxos.function.web-search.fetch + Anthropic web search), which is not registered in the local
//   harness runtime, so it can only be regenerated in an environment that provides it.
describe.skip('Web', () => {
  it.effect(
    'search the web',
    agentTest({
      instructions: trim`
        Search 5 richest people in the world and create Person objects in the database.
      `,
      completionCriteria: [
        //
        '5 Person objects in the database.',
        'Web search works.',
      ],
    }),
    { timeout: agentTestTimeout() },
  );
});
