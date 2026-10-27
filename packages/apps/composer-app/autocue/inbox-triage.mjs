//
// Copyright 2026 DXOS.org
//

/**
 * Triage an unsorted inbox with one click, see every request become a task in a project, then hand the most
 * urgent one to the agent, which drafts the reply and asks before it sends.
 *
 * @mdl packages/plugins/plugin-labeler/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5180`.
 *   Triage asks Jev through EDGE and Clairic through EDGE's `/ai/generate/workers-ai/clairic` route; until that
 *   route is deployed, pass `extractionEndpoint` (below) pointing at a loopback proxy to Workers AI.
 * @driver `--caption-background 0.45`; extraction proxy via `AUTOCUE_EXTRACTION_ENDPOINT`
 */

/** Clairic endpoint override for an EDGE without the route; empty uses EDGE. */
const EXTRACTION_ENDPOINT = process.env.AUTOCUE_EXTRACTION_ENDPOINT ?? '';

const SUBTITLE = 'plugin-labeler/PLUGIN.mdl · QA-2';
const TEMPLATE = 'org.dxos.plugin-debug.template.triage';
const PLUGINS = ['org.dxos.plugin.debug', 'org.dxos.plugin.labeler', 'org.dxos.plugin.typesafe'];
const AGENT_TIMEOUT = 300_000;
const BEAT = 1_200;

const PLANK = '[data-testid="deck.plank"]';
const COMPANION = '[data-testid="deck.companion"]';
const SECTION = '[data-testid="inbox.section"]';
const TASK = `${COMPANION} [data-testid="message.task"]`;
const REQUEST = `${COMPANION} [data-testid="assistant.request"]`;
/** A navtree entry by its exact label (`has-text` would let "Inbox" match "Inbox tasks"). */
const TREE_ITEM = (label) => `[data-testid="deck.sidebar"] :text-is("${label}") >> visible=true`;

const caption = async (demo, value) => {
  await demo.caption({ value, subtitle: SUBTITLE });
  await demo.sleep({ ms: 1_800 });
};

/** Clicks a navtree item, expanding its parent first when it is not yet visible. */
const openTreeItem = async (demo, page, parent, label) => {
  const item = page.locator(TREE_ITEM(label)).first();
  if (!(await item.isVisible().catch(() => false))) {
    await demo.click({ selector: `${TREE_ITEM(parent)} >> nth=0`, label: parent });
  }
  await demo.click({ selector: `${TREE_ITEM(label)} >> nth=0`, label });
};

/** Invokes an operation once the app has booted far enough to serve it, retrying while it registers. */
const invokeWhenReady = async (page, key, input) => {
  await page.waitForFunction(() => globalThis.composer?.invoke, undefined, { timeout: 120_000 });
  await page.locator('[data-testid="spacePlugin.addSpace"]').first().waitFor({ timeout: 120_000 });
  for (let attempt = 0; ; attempt++) {
    try {
      return await page.evaluate(({ key, input }) => globalThis.composer.invoke(key, input), { key, input });
    } catch (error) {
      if (attempt > 90) {
        throw error;
      }
      await page.waitForTimeout(1_000);
    }
  }
};

export const steps = [
  {
    name: 'Prep (off camera): enable triage and its models',
    setup: true,
    done: ({ page }) =>
      page.evaluate((ids) => ids.every((id) => globalThis.composer?.manager.getEnabled().includes(id)), PLUGINS),
    run: async ({ page }) => {
      if (EXTRACTION_ENDPOINT) {
        await page.evaluate(
          (endpoint) =>
            localStorage.setItem('org.dxos.plugin.typesafe', JSON.stringify({ extractionEndpoint: endpoint })),
          EXTRACTION_ENDPOINT,
        );
      }
      const enable = async () => {
        await invokeWhenReady(page, 'org.dxos.operation.registry.enablePlugins', { ids: PLUGINS });
        await page.waitForFunction(
          (ids) => ids.every((id) => globalThis.composer.manager.getEnabled().includes(id)),
          PLUGINS,
          { timeout: 30_000 },
        );
      };
      await enable();
      // Settings are read when a plugin activates, so the endpoint override needs a fresh boot. The
      // enabled set is saved asynchronously; a reload straight away can lose it, so wait, then check.
      if (EXTRACTION_ENDPOINT) {
        await page.waitForTimeout(5_000);
        await page.reload();
        await page.locator('[data-testid="spacePlugin.addSpace"]').first().waitFor({ timeout: 120_000 });
        await enable();
      }
    },
  },
  {
    name: 'Prep (off camera): create the inbox and open it',
    setup: true,
    done: async ({ page }) => (await page.locator(`${PLANK} [data-testid="inbox.mailbox"]`).count()) > 0,
    run: async ({ page }) => {
      await invokeWhenReady(page, 'org.dxos.operation.space.create', { name: 'Inbox triage', template: TEMPLATE });
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await notice.first().click();
      }
      await page.locator(`[data-testid="spacePlugin.space"]`).last().click();
      const inbox = page.locator(TREE_ITEM('Inbox')).first();
      if (!(await inbox.isVisible().catch(() => false))) {
        await page.locator(TREE_ITEM('Mailboxes')).first().click();
      }
      await inbox.click();
      await page.locator(`${PLANK} [data-testid="inbox.mailbox"]`).first().waitFor({ timeout: 60_000 });
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'Start with an unsorted inbox',
    narration: 'A morning inbox: nothing read, nothing sorted.',
    run: async ({ demo, page }) => {
      await page.mouse.move(900, 500);
      await demo.cut();
      await demo.title({
        value: 'Inbox triage',
        subtitle: 'Decision and extraction models, then an agent',
        hold: 3_600,
      });
      await caption(demo, 'Start with an unsorted inbox');
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Triage the inbox',
    narration:
      'One click asks a decision model about every email, and an extraction model pulls out what each one asks for.',
    done: async ({ page }) =>
      (await page.locator(`${SECTION}[data-section="priority-urgent"]`).count()) > 0 &&
      (await page.locator(`${SECTION}[data-section="untriaged"]`).count()) === 0,
    run: async ({ demo, page }) => {
      await caption(demo, 'Triage: label, prioritise and extract tasks with one click');
      await demo.click({ selector: `${PLANK} button[aria-label="Extract"]`, label: 'Magic' });
      await demo.click({ selector: '[role="menuitem"]:has-text("Triage inbox")', label: 'Triage inbox' });
      await page.locator(`${SECTION}[data-section="priority-urgent"]`).first().waitFor({ timeout: 60_000 });
      await page.waitForFunction(
        (selector) => !document.querySelector(`${selector}[data-section="untriaged"]`),
        SECTION,
        { timeout: 60_000 },
      );
      await caption(demo, 'Messages regroup by priority');
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Every request becomes a task',
    narration: 'Each request lands as a task in one project, prioritised like the email it came from.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Every request became a task, filed in one project');
      await openTreeItem(demo, page, 'Projects', 'Inbox tasks');
      const tasksTab = `${PLANK} [data-testid="projectsPlugin.tab.tasks"]`;
      await page.locator(tasksTab).first().waitFor({ timeout: 30_000 });
      await demo.click({ selector: `${tasksTab} >> nth=0`, label: 'Tasks' });
      await page.locator(`${PLANK} [data-testid="taskList.item"]`).first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
  {
    name: 'Open the most urgent email',
    narration: 'Back in the inbox, open the most urgent email: its task sits right under it.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Open the most urgent email');
      await openTreeItem(demo, page, 'Mailboxes', 'Inbox');
      const urgent = `${SECTION}[data-section="priority-urgent"]`;
      await page.locator(urgent).first().waitFor({ timeout: 30_000 });
      await demo.click({
        selector: `${PLANK} [data-testid="inbox.mailbox"] :text("Renewal — need your written OK today") >> nth=0`,
        label: 'Renewal',
      });
      await page.locator(TASK).first().waitFor({ timeout: 30_000 });
      await caption(demo, 'The task extracted from it sits underneath');
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Assign the task to the agent',
    narration: 'Assign the task to the agent: the assistant opens beside the inbox and starts on it.',
    run: async ({ demo, page }) => {
      await demo.hover({ selector: `${TASK} >> nth=0`, label: 'Task' });
      await demo.click({ selector: `${TASK} button[aria-label="Task actions"] >> nth=0`, label: 'More' });
      await demo.click({ selector: '[role="menuitem"]:has-text("Assign to agent")', label: 'Assign to agent' });
      await page.locator(`${COMPANION} [data-testid="assistant.prompt"]`).first().waitFor({ timeout: 30_000 });
      await caption(demo, 'The agent drafts a reply');
    },
  },
  {
    name: 'The agent asks before it sends',
    narration:
      'Sending email needs permission, so the agent stops and asks in the chat, with the reply it drafted under the request.',
    run: async ({ demo, page }) => {
      await demo.speed({ factor: 6 });
      await page.locator(REQUEST).first().waitFor({ state: 'visible', timeout: AGENT_TIMEOUT });
      await demo.speed({ factor: 1 });
      await caption(demo, 'Sending needs your permission');
      await demo.click({
        selector: `${REQUEST} [data-testid="assistant.request.preview"] button >> nth=0`,
        label: 'Reply',
      });
      // Expanding does not scroll the thread, so bring the whole preview into view.
      await page.waitForTimeout(600);
      await page
        .locator(`${REQUEST} [data-testid="assistant.request.preview"]`)
        .first()
        .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      await caption(demo, 'The reply it will send, under the request');
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: 'Allow it to send',
    narration: 'Allow it, and the reply goes out.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${REQUEST} button:has-text("Allow") >> nth=0`, label: 'Allow' });
      await page.locator(`${REQUEST}:has-text("Allow")`).first().waitFor({ timeout: 10_000 });
      await demo.speed({ factor: 4 });
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-testid="deck.companion"] *')].some((element) =>
            /ready for review|sent/i.test(element.textContent ?? ''),
          ),
        undefined,
        { timeout: AGENT_TIMEOUT },
      );
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'See the reply under the email',
    narration: 'The reply is threaded under the email it answers, and the task waits for your review.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The reply is threaded under the original email');
      // The conversation's tile lists both messages; open the original so the reply reads beneath it.
      await demo.click({
        selector: `${PLANK} [data-testid="inbox.mailbox"] :text-is("Dana Ruiz") >> nth=0`,
        label: 'Dana Ruiz',
      });
      await page.waitForFunction(
        (selector) => document.querySelectorAll(selector).length >= 2,
        `${COMPANION} [data-scope="card"][data-part="root"]`,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: `${COMPANION} :text-is("Me") >> nth=0`, label: 'Reply' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the answered inbox',
    narration: 'Small, typed models sort the inbox in seconds; the agent works on the same objects you do.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 8);
    },
  },
];
