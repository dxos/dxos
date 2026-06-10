//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { vi } from 'vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

const _realFetch = globalThis.fetch;

// Mock global fetch for the web-search operation; pass API calls through to the real implementation.
vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
  if (typeof url === 'string' && !url.includes('anthropic.com') && !url.includes('dxos.network')) {
    return {
      text: async () => `<html><body>
<h1>World's Wealthiest People 2025</h1>
<ol>
<li>Elon Musk - $400 billion (Tesla, SpaceX, X)</li>
<li>Jeff Bezos - $200 billion (Amazon, Blue Origin)</li>
<li>Mark Zuckerberg - $185 billion (Meta)</li>
<li>Larry Ellison - $175 billion (Oracle)</li>
<li>Bill Gates - $150 billion (Microsoft)</li>
</ol>
</body></html>`,
    } as unknown as Response;
  }
  return _realFetch(url, init);
});

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
    { timeout: agentTestTimeout(), tags: ['flaky'] },
  );
});
