//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

// TODO(burdon): Re-enable + regenerate web.conversations.json. The Event schema change
//   (location/allDay) invalidated this fixture (DatabaseBlueprint serializes registered schemas into
//   the prompt). The web-search Fetch handler is now registered (plugin-assistant), so the tool
//   resolves; but regeneration still needs Anthropic's live web_search tool to return results, which
//   it does not in this local harness — regenerate in an environment where web_search works.
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
