//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import { type Peer, createPeer } from './composer';

const tooltipState = z.object({
  visible: z.boolean().describe('whether an onboarding help tooltip / guided tour popup is visible'),
  step: z.number().nullable().describe('the current step number shown by the tooltip, if any'),
});

// TODO(wittjosiah): These are skipped because trigger for joyride is currently part of beta auth flow.
describe.skip('First-run tests', () => {
  let host: Peer;

  beforeEach(async () => {
    host = await createPeer();
  });

  afterEach(async () => {
    await host.close();
  });

  test('help plugin tooltip displays (eventually) on first run and increments correctly', async () => {
    const initial = await host.extract('Describe the onboarding help tooltip state.', tooltipState);
    expect(initial.visible).toBe(true);

    for (let step = 2; step <= 4; step++) {
      await host.act('Click the "Next" button in the help tooltip');
      await host.page.waitForTimeout(500);
      const state = await host.extract('Describe the onboarding help tooltip state.', tooltipState);
      expect(state.step).toBe(step);
    }
    await host.act('Click the "Finish" button in the help tooltip');
    await host.page.waitForTimeout(500);
    const finished = await host.extract('Describe the onboarding help tooltip state.', tooltipState);
    expect(finished.visible).toBe(false);
  });

  test('help plugin tooltip does not display when not first run', async () => {
    const initial = await host.extract('Describe the onboarding help tooltip state.', tooltipState);
    expect(initial.visible).toBe(true);

    await host.page.reload();
    await host.page.waitForTimeout(2_000);
    const state = await host.extract('Describe the onboarding help tooltip state.', tooltipState);
    expect(state.visible).toBe(false);
  });
});
