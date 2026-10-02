//
// Copyright 2026 DXOS.org
//

/**
 * The Sandbox article as a shell: cd and export carry from line to line, and an agent's plain exec
 * runs alongside a busy terminal without waiting for it.
 *
 * @mdl packages/plugins/plugin-sandbox/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_SANDBOX_SERVICE_URL=http://localhost:8792 moon run composer-app:serve` on :4173,
 *   against a sandbox-service on :8792 started with edge's `test/test-worker.ts` (`startTestWorker({ port: 8792,
 *   bindings: { EDGE_CONFIG: { sandbox: { noAuth: true } } } })`, needs Docker); the Sandbox plugin enabled and
 *   a Sandbox named "Demo Sandbox" in the first space.
 */

const TERMINAL = '.xterm-helper-textarea';

/** Types a line into the terminal at a person's pace and submits it. */
const enter = async (demo, line) => {
  await demo.type({ selector: TERMINAL, value: line, delay: 45 });
  await demo.press({ key: 'Enter', hud: false });
};

/** Waits for `text` to show in the terminal's rendered rows. */
const waitForOutput = (page, text, timeout = 60_000) =>
  page.waitForFunction((expected) => document.querySelector('.xterm-rows')?.textContent?.includes(expected), text, {
    timeout,
  });

/**
 * Runs `Exec` on the open sandbox as an agent would, through the operation invoker. `composer.invoke`
 * validates a materialized `Ref`, so the object is loaded through the page's own client first.
 */
const exec = (page, input) =>
  page.evaluate(async (input) => {
    const spaceId = location.pathname.split('/')[2];
    const objectId = location.pathname.split('+').at(-1);
    const { client, Ref } = globalThis.__DXOS__;
    const sandbox = await client.spaces.get(spaceId).db.getObjectById(objectId);
    return composer.invoke(
      'dxn:org.dxos.operation.sandbox.exec',
      { sandbox: Ref.make(sandbox), ...input },
      { spaceId },
    );
  }, input);

export const steps = [
  {
    name: 'Open its shell',
    setup: true,
    run: async ({ demo, page }) => {
      await demo.click({ text: 'Demo Sandbox', hud: false });
      await page.reload();
      await page.locator(TERMINAL).waitFor({ state: 'attached', timeout: 60_000 });
      await waitForOutput(page, '$');
      // Start the take from the workspace root, whatever an earlier take left behind.
      await exec(page, { command: 'cd /workspace && unset GREETING && rm -rf demo', session: 'terminal' });
      await page
        .locator('[data-testid="org.dxos.plugin.observability.notice"] button')
        .last()
        .click({ timeout: 2_000 })
        .catch(() => {});
      // Nothing before this is part of the take.
      await demo.cut();
    },
  },
  {
    name: 'Change directory and export a variable',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'A Sandbox opens as a shell in its container',
        subtitle: 'each line is one exec, in the session "terminal"',
      });
      await enter(demo, 'mkdir -p demo && cd demo && export GREETING=hello');
      await page.waitForTimeout(1_500);
    },
  },
  {
    name: 'The next line sees both',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'cd and export carry to the next line' });
      await enter(demo, 'echo "$GREETING from $(pwd)"');
      await waitForOutput(page, 'hello from /workspace/demo');
      await page.waitForTimeout(1_500);
    },
  },
  {
    name: 'A failing command reports its exit code',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Errors in red, with the exit code' });
      await enter(demo, 'ls missing');
      await waitForOutput(page, 'exit 2');
      await page.waitForTimeout(1_500);
    },
  },
  {
    name: "Plain exec runs alongside, without the session's state",
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'A slow command holds the terminal…', subtitle: 'sleep 6 in the session' });
      await enter(demo, 'sleep 6 && echo "done in $(pwd)"');
      await page.waitForTimeout(800);
      const result = await exec(page, { command: 'echo "[$GREETING] in $(pwd)"' });
      await demo.caption({
        value: `…while an agent's exec answers at once: ${result.stdout.trim()}`,
        subtitle: "no session: its own process, none of the terminal's state",
      });
      await waitForOutput(page, 'done in /workspace/demo', 30_000);
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'The shell outlives the page',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Reload: the shell is still where it was' });
      await page.reload();
      await page.locator(TERMINAL).waitFor({ state: 'attached', timeout: 60_000 });
      await waitForOutput(page, '$');
      await enter(demo, 'pwd && echo $GREETING');
      await waitForOutput(page, '/workspace/demo');
      await page.waitForTimeout(2_500);
      await demo.clearCaption();
    },
  },
];
