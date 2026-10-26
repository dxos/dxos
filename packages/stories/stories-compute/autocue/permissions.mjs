//
// Copyright 2026 DXOS.org
//

/**
 * Spawn real-model agents with chosen permissions, locally and on EDGE, and watch the guard admit or refuse
 * their tool calls.
 *
 * @mdl packages/stories/stories-compute/STORIES.mdl test QA-2
 * @app storybook via `DX_STORIES=stories/stories-compute VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve`
 *      on :9009, story `stories-stories-compute-permissions--edge` (dev EDGE, model through preview.dxos.network/ai)
 */

const SUBTITLE = 'from stories-compute/STORIES.mdl QA-2';

/** The card of the n-th spawned agent. */
const card = (page, index) => page.locator('[data-testid="permission-agent"]', { hasText: `Agent ${index} ·` });

/** Holds the take until a local agent has finished its turn, so its refusal and its reply are both on screen. */
const waitForAnswer = (page, index) =>
  card(page, index)
    .locator('[data-testid="permission-agent-state"]', { hasText: 'SUCCEEDED' })
    .waitFor({ timeout: 90_000 });

/** An EDGE agent stays IDLE after its turn, so its card is done once the write it was not granted has a result. */
const waitForEdgeWrite = async (page, index) => {
  await card(page, index)
    .locator('[data-testid="transcript-tool-call"]', { hasText: 'Update Object' })
    .waitFor({ timeout: 90_000 });
  await page.waitForFunction(
    (title) => {
      const card = [...document.querySelectorAll('[data-testid="permission-agent"]')].find((element) =>
        element.textContent?.includes(title),
      );
      const lines = [...(card?.querySelectorAll('[data-testid="permission-agent-transcript"] > *') ?? [])];
      const call = lines.findLastIndex((line) => line.textContent?.includes('Update Object'));
      return (
        call >= 0 && lines.slice(call + 1).some((line) => line.getAttribute('data-testid') === 'transcript-answer')
      );
    },
    `Agent ${index} ·`,
    { timeout: 90_000 },
  );
};

const setPermission = async (demo, page, id, checked) => {
  const box = page.locator(`[data-testid="permission-${id}"]`);
  const state = await box.locator('[data-part="control"]').getAttribute('data-state');
  if ((state === 'checked') !== checked) {
    await demo.click({ selector: `[data-testid="permission-${id}"]`, label: id });
  }
};

const spawn = async (demo, page, prompt, index) => {
  await demo.click({ text: prompt, exact: true });
  await demo.click({ selector: '[data-testid="permission-spawn"]', label: 'Spawn agent' });
  await card(page, index).waitFor({ timeout: 10_000 });
};

export const steps = [
  {
    name: 'Grant Database read and list the organizations',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Grant only Database read, and ask for the organizations', subtitle: SUBTITLE });
      await setPermission(demo, page, 'read', true);
      await setPermission(demo, page, 'write', false);
      await setPermission(demo, page, 'exec', false);
      await spawn(demo, page, 'List the organizations in the database.', 1);
      await demo.speed({ factor: 4 });
      await waitForAnswer(page, 1);
      await demo.speed({ factor: 1 });
      await card(page, 1).locator('[data-testid="permission-tool-process"]', { hasText: 'SUCCEEDED' }).waitFor();
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'Ask the read-only agent to write',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Same grant, now update a record: the write is refused', subtitle: SUBTITLE });
      await spawn(demo, page, 'Mark Acme Robotics as an active customer.', 2);
      await demo.speed({ factor: 4 });
      await waitForAnswer(page, 2);
      await demo.speed({ factor: 1 });
      await card(page, 2).locator('[data-testid="permission-agent-refusals"]').waitFor();
      await demo.sleep({ ms: 3_500 });
    },
  },
  {
    name: 'Run a sandbox command without Sandbox exec',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Run a sandbox command without Sandbox exec: refused', subtitle: SUBTITLE });
      await spawn(demo, page, 'Run `uname -a` in the sandbox.', 3);
      await demo.speed({ factor: 4 });
      await waitForAnswer(page, 3);
      await demo.speed({ factor: 1 });
      await card(page, 3).locator('[data-testid="permission-agent-refusals"]').waitFor();
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Grant Sandbox exec and run it again',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Tick Sandbox exec and spawn again: the command runs', subtitle: SUBTITLE });
      await setPermission(demo, page, 'exec', true);
      await spawn(demo, page, 'Run `uname -a` in the sandbox.', 4);
      await demo.speed({ factor: 4 });
      await waitForAnswer(page, 4);
      await demo.speed({ factor: 1 });
      await card(page, 4).locator('[data-testid="permission-tool-process"]', { hasText: 'SUCCEEDED' }).waitFor();
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Ask a read-only agent on EDGE to write',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'On EDGE no guard is sent: a read-only agent writes unchecked',
        subtitle: SUBTITLE,
      });
      await setPermission(demo, page, 'exec', false);
      await demo.click({ selector: '[data-testid="permission-location"]', label: 'Location' });
      await demo.click({ selector: '[data-scope="select"][data-value="edge"]', label: 'EDGE' });
      await spawn(demo, page, 'Mark Acme Robotics as an active customer.', 5);
      await demo.speed({ factor: 4 });
      await waitForEdgeWrite(page, 5);
      await demo.speed({ factor: 1 });
      await card(page, 5).locator('[data-testid="permission-agent-unguarded"]').waitFor();
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Compare the agents',
    narration:
      'Each local agent ran with exactly the permissions it was granted; an operation that declares a permission the grant does not cover is refused before its handler runs.',
    run: async ({ demo }) => {
      await demo.caption({
        value: 'Local agents hold exactly their grants; EDGE ignores them',
        subtitle: SUBTITLE,
      });
      await demo.sleep({ ms: 8_000 });
    },
  },
];
