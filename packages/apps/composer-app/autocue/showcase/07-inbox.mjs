//
// Copyright 2026 DXOS.org
//

/**
 * Showcase scene 7: Inbox. Open a synced Gmail mailbox, open a thread and its AI summary, draft a reply with
 * AI reply, then turn the message into a project.
 *
 * @mdl packages/apps/composer-app/spec/APP.mdl test QA-13
 * @app composer-app bundled dev build against EDGE preview (launch config `composer-showcase`, :4183), on the
 *   showcase profile, where a Mailbox named `MAILBOX` is connected to Gmail and has synced. Record with
 *   `driver.mjs --profile <showcase profile>`; a fresh identity has no mailbox.
 *
 * Nothing here sends mail: AI reply leaves a draft, and the take never presses Send. Set `SUBJECT` to a thread
 * that is safe to show on camera.
 */

const { prep } = await import(`./01-home.mjs${new URL(import.meta.url).search}`);

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

/** The mailbox's name in the navtree. */
const MAILBOX = 'Gmail';

/** A substring of the subject of the thread to open; the first row when unset. */
const SUBJECT = undefined;

const PLANK = '[data-testid="deck.plank"]';
const ROW = '[data-testid="inbox.conversation.row"], [data-testid="inbox.message.row"]';

/** The navtree row of the object named exactly `name`. */
const treeObject = async (page, name) => {
  const index = await page
    .locator('[data-testid="spacePlugin.object"]')
    .evaluateAll((rows, name) => rows.findIndex((row) => row.innerText.trim().split('\n')[0] === name), name);
  return index < 0 ? undefined : `[data-testid="spacePlugin.object"] >> nth=${index}`;
};

/** Waits on an agent off camera: a beat of it starting, then a jump cut to the result. */
const cutWhile = async ({ demo, page }, wait) => {
  await page.waitForTimeout(BEAT);
  await demo.pause();
  try {
    await wait();
  } finally {
    await demo.resume();
  }
};

/** A message-toolbar action by its label: a visible button, else an item in the toolbar's overflow menu. */
const toolbarAction = async ({ demo, page }, label) => {
  const button = `${PLANK} >> role=button[name="${label}"]`;
  if (
    await page
      .locator(button)
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await demo.click({ selector: `${button} >> nth=0`, label });
    return;
  }
  await demo.click({ selector: `${PLANK} >> role=button[name="More"] >> nth=0`, label: 'More' });
  await demo.click({ selector: `role=menuitem[name="${label}"] >> nth=0`, label });
};

export const steps = [
  prep,
  {
    name: 'Setup (off camera): the synced mailbox is here',
    setup: true,
    run: async ({ page }) => {
      if (!(await treeObject(page, MAILBOX))) {
        throw new Error(`no mailbox named ${MAILBOX}: connect Gmail on this profile first (see the spec)`);
      }
    },
  },
  {
    name: 'Open the mailbox',
    narration: 'Your inbox lives here too. Gmail syncs into your space.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: await treeObject(page, MAILBOX), label: MAILBOX });
      await page.locator('[data-testid="inbox.mailbox"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator(ROW).first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open a thread and its summary',
    narration: 'Agents summarize a thread before you read it.',
    run: async ({ demo, page }) => {
      const row = SUBJECT ? `:is(${ROW}):has-text("${SUBJECT}") >> nth=0` : `:is(${ROW}) >> nth=0`;
      await demo.click({ selector: row, label: 'Thread' });
      await page.locator('[data-testid="message-header"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page
        .locator('[data-testid="conversation.summary"]')
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 })
        .catch(() => undefined);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Draft a reply with AI',
    narration: 'Draft a reply in your voice.',
    run: async (context) => {
      const { page } = context;
      await toolbarAction(context, 'AI reply');
      await cutWhile(context, () =>
        page.locator('[data-testid="edit-email-form"]').first().waitFor({ state: 'visible', timeout: 120_000 }),
      );
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Turn the message into a project',
    narration: 'Or turn a request into a project.',
    run: async (context) => {
      const { page } = context;
      await toolbarAction(context, 'Create Project');
      await cutWhile(context, () =>
        page.locator('[data-testid="projectsPlugin.tab.tasks"]').first().waitFor({ state: 'visible', timeout: 60_000 }),
      );
      await page.waitForTimeout(BEAT * 3);
    },
  },
];
