//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

Obj.ID.dangerouslyDisableRandomness();

describe('Web', () => {
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
