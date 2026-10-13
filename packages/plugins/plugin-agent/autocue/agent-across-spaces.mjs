//
// Copyright 2026 DXOS.org
//

/**
 * Mykola makes an agent, tells it about the team offsite, adds it to another space from that space's Members panel
 * (as he would a person), and opens it there: the same conversation continues, and the agent reads what it learned
 * from its brain with a tool call.
 *
 * @mdl packages/plugins/plugin-agent/PLUGIN.mdl test QA-4
 * @app composer-app dev server on 127.0.0.1:4173, talking to EDGE preview (the default in `dx-local.yml`)
 *
 * Served from the repository root, then driven on a fresh profile so the take starts in a new identity's
 * "My Space":
 *
 *   DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173 --host 127.0.0.1
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://127.0.0.1:4173 --out /tmp/demo --profile <empty dir>
 *   curl … -d '{"op":"run","file":"packages/plugins/plugin-agent/autocue/agent-across-spaces.mjs","wait":false}'
 *
 * The replies come from a live model, so the steps wait for each reply to settle rather than for its words.
 * Keep the file free of imports: it is loaded from outside the workspace.
 */

const SUBTITLE = 'plugin-agent/PLUGIN.mdl › QA-4';
const HOME = 'My Space';
const OTHER = 'Offsite team';
const AGENT = 'Kai';
const PERSON = 'Mykola';

const MESSAGES = [
  `Hi ${AGENT}, I'm ${PERSON}. Our team offsite is in Lisbon on November 14, for 12 people, and Dima is booking the venue.`,
  'The budget is 8,000 euros, and flights are still open.',
];
const QUESTION = 'Check your memory: what do we have so far for the offsite?';

const BEAT = 1_000;
const TIMEOUT = 60_000;
const REPLY_TIMEOUT = 180_000;
/** How long a reply must stay unchanged to count as finished: a turn streams, then runs its tools. */
const SETTLED_MS = 4_000;

const PLANK = '[data-testid="deck.plank"]';
const PROMPT = `${PLANK} [data-testid="assistant.prompt"] .cm-content`;
const FEED = `${PLANK} [data-testid="feed.message"]`;
/** Rendered only while a turn runs. */
const ACTIVITY = `${PLANK} [data-testid="assistant.chat-activity"]`;
const TOOL_ROW = '[data-testid^="assistant.tool-"]';
const WORKSPACE = '[data-testid="navtree.workspace.visible"]';
const row = (heading) => `${WORKSPACE} [role="treeitem"]:has([data-testid="treeItem.heading"]:text-is("${heading}"))`;
const AGENT_ROW = row(AGENT);

const isVisible = (locator) => locator.isVisible().catch(() => false);

/**
 * Waits for the turn a message started to finish: the chat's activity indicator (shown only while a turn
 * runs) is gone, the last message is words rather than a tool row, and nothing has changed for a while.
 */
const waitForReply = async (page, before) => {
  const deadline = Date.now() + REPLY_TIMEOUT;
  const feed = page.locator(FEED);
  let previous = '';
  let changedAt = Date.now();
  for (;;) {
    const texts = await feed.allInnerTexts();
    const snapshot = texts.join('\n');
    if (snapshot !== previous) {
      previous = snapshot;
      changedAt = Date.now();
    }
    const busy = (await page.locator(ACTIVITY).count()) > 0;
    const last = texts.length >= before + 2 ? feed.nth(texts.length - 1) : undefined;
    const words = last && (await last.locator(TOOL_ROW).count()) === 0 && texts.at(-1).trim().length > 0;
    if (!busy && words && Date.now() - changedAt > SETTLED_MS) {
      return texts.at(-1).trim();
    }
    if (Date.now() > deadline) {
      throw new Error(`no finished reply within ${REPLY_TIMEOUT / 1_000}s`);
    }
    await page.waitForTimeout(500);
  }
};

/** Types a message into the open chat as a person would, sends it, and waits for the reply. */
const send = async ({ demo, page }, text) => {
  // The caption banner sits over the prompt; the step's title has been read by now.
  await demo.clearCaption();
  const before = await page.locator(FEED).count();
  await demo.click({ selector: `${PROMPT} >> nth=0`, label: 'Message' });
  await page.keyboard.type(text, { delay: 20 });
  await page.waitForTimeout(BEAT / 2);
  await demo.press({ key: 'Enter' });
  return waitForReply(page, before);
};

/** The workspace the navtree shows: its header is the space's name. */
const currentSpace = (page) =>
  page
    .locator('[data-testid="navtree.workspace.visible"]')
    .first()
    .innerText()
    .then((text) => text.split('\n')[0].trim())
    .catch(() => undefined);

/**
 * Opens a space by name, off camera, through the layout's switch-workspace operation: the rail's tab is a
 * tooltip trigger whose click Playwright cannot land reliably while a new space is still opening. The tab
 * names the space, and its value is the workspace id. Checked against the navtree's header.
 */
const openSpace = async (page, name) => {
  const tab = page.locator('[data-testid="spacePlugin.space"]', { hasText: name }).first();
  await tab.waitFor({ state: 'attached', timeout: TIMEOUT });
  const workspace = await tab.getAttribute('data-value');
  const deadline = Date.now() + TIMEOUT;
  while ((await currentSpace(page)) !== name) {
    if (Date.now() > deadline) {
      throw new Error(`could not open the space "${name}"`);
    }
    await page.evaluate(
      (subject) => composer.invoke('org.dxos.operation.appToolkit.switchWorkspace', { subject }),
      workspace,
    );
    await page.waitForTimeout(BEAT);
  }
};

/** Expands a navtree row unless it is open already. */
const expand = async ({ demo, page }, selector, label) => {
  const toggle = page.locator(`${selector} [data-part="branch-trigger"]`).first();
  await toggle.waitFor({ state: 'attached', timeout: TIMEOUT });
  if ((await toggle.getAttribute('data-state')) !== 'open') {
    await page.locator(selector).first().hover();
    await demo.click({ selector: `${selector} [data-part="branch-trigger"] >> nth=0`, label });
  }
};

const caption = (demo, value) => demo.caption({ value, subtitle: SUBTITLE, hold: 2_500 });

export const steps = [
  {
    name: `Prep (off camera): name the identity, enable the Agent plugin, add the "${OTHER}" space`,
    setup: true,
    run: async ({ demo, page }) => {
      const notice = page.locator(
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
      );
      if (
        await notice
          .first()
          .waitFor({ state: 'visible', timeout: 8_000 })
          .then(
            () => true,
            () => false,
          )
      ) {
        await notice.first().click();
      }

      // The agent's private chat names the person after the identity, as does the memory it carries.
      await demo.invoke({ key: 'org.dxos.operation.client.updateProfile', input: { displayName: PERSON } });

      const enabled = () =>
        page.evaluate(() => composer.plugins().some(({ id, active }) => id === 'org.dxos.plugin.agent' && active));
      if (!(await enabled())) {
        await demo.click({ selector: '[data-testid="treeView.pluginRegistry"]', hud: false });
        const filter = 'input[placeholder="Filter…"]';
        await page.locator(filter).first().waitFor({ state: 'visible', timeout: 10_000 });
        await demo.fill({ selector: filter, value: 'Agent', hud: false });
        await demo.click({
          selector: '[data-scope="switch"][data-part="root"]:has(input[role="switch"][aria-label="Agent"])',
          hud: false,
        });
        await page.waitForFunction(
          () => composer.plugins().some(({ id, active }) => id === 'org.dxos.plugin.agent' && active),
          undefined,
          { timeout: 30_000 },
        );
      }

      if ((await page.locator(`[data-testid="spacePlugin.space"]`).count()) < 2) {
        await demo.click({ selector: '[data-testid="spacePlugin.addSpace"] >> nth=0', hud: false });
        await demo.click({ selector: 'role=menuitem[name="Create space"]', hud: false });
        await demo.type({
          selector: '[data-testid="create-space-dialog"] input[placeholder="Name"]',
          value: OTHER,
          hud: false,
        });
        await demo.click({
          selector: '[data-testid="create-space-dialog"] button:has-text("Create") >> nth=-1',
          hud: false,
        });
        await page.getByText(OTHER, { exact: true }).first().waitFor({ state: 'visible', timeout: TIMEOUT });
      }

      // The take starts on the home space's Home, with the help companion closed for the width.
      await openSpace(page, HOME);
      await demo.click({ selector: '[data-testid="spacePlugin.spaceHome"]', hud: false });
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await isVisible(close)) {
        await close.click();
      }
      await page.waitForTimeout(BEAT);
      await demo.cut();
    },
  },
  {
    name: `Create an agent named "${AGENT}"`,
    done: async ({ page }) => (await page.locator(AGENT_ROW).count()) > 0,
    run: async ({ demo, page }) => {
      await openSpace(page, HOME);
      await caption(demo, `1 · In "${HOME}", create an agent named ${AGENT}`);
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.agent"]', label: 'Agent' });
      await demo.type({ selector: '[role="dialog"] input >> nth=0', value: AGENT, label: 'Name' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await page.locator(AGENT_ROW).first().waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.locator(PROMPT).first().waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: `Tell ${AGENT} about the offsite`,
    run: async ({ demo, page }) => {
      await caption(demo, `2 · Tell ${AGENT} about the team offsite`);
      await send({ demo, page }, MESSAGES[0]);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Add the budget',
    run: async ({ demo, page }) => {
      await caption(demo, '3 · Add the budget');
      await send({ demo, page }, MESSAGES[1]);
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: `Add ${AGENT} to "${OTHER}" from its Members panel`,
    run: async ({ demo, page }) => {
      await openSpace(page, OTHER);
      await caption(demo, `4 · In "${OTHER}", add ${AGENT} from Members, as you would a person`);
      await expand({ demo, page }, `${WORKSPACE} [data-testid="spacePlugin.settings"]`, 'Settings');
      await demo.click({
        selector: `${WORKSPACE} [data-testid="spacePlugin.members"] [data-testid="treeItem.heading"] >> nth=0`,
        label: 'Members',
      });
      await demo.click({ selector: '[data-testid="contact-picker.trigger"] >> nth=0', label: 'Add from contacts' });
      await demo.click({ selector: `[data-testid="contact-picker.item"]:has-text("${AGENT}")`, label: AGENT });
      await demo.click({ selector: '[data-testid="contactPicker.add"]', label: 'Add' });
      // The space lists it under Agents once it is here.
      await page.locator(row('Agents')).first().waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: `Open ${AGENT} in "${OTHER}": the same conversation`,
    run: async ({ demo, page }) => {
      await caption(demo, `5 · Open ${AGENT} there: one conversation, not one per space`);
      await expand({ demo, page }, row('Agents'), 'Agents');
      await demo.click({ selector: `${AGENT_ROW} [data-testid="treeItem.heading"] >> nth=0`, label: AGENT });
      await page.locator(FEED).filter({ hasText: 'Lisbon' }).first().waitFor({ state: 'visible', timeout: TIMEOUT });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: `Ask ${AGENT} to check its memory`,
    run: async ({ demo, page }) => {
      await caption(demo, `6 · Ask ${AGENT} to check its memory: it reads its brain with a tool`);
      await send({ demo, page }, QUESTION);
      // The turn's tool row names the tool it called: Recall.
      await demo.click({ selector: `${PLANK} >> text=/^Ran \\d+ commands?$/ >> nth=-1`, label: 'Tools' });
      await page.waitForTimeout(BEAT * 3);
    },
  },
  {
    name: `Read ${AGENT}'s brain from "${OTHER}"`,
    run: async ({ demo, page }) => {
      await caption(demo, `7 · ${AGENT}'s brain, seen from "${OTHER}": the facts it learned in "${HOME}"`);
      const brainTab = '[data-testid="deck.companion.tab.brain"] >> nth=0';
      if (!(await isVisible(page.locator(brainTab)))) {
        await demo.click({ selector: `${PLANK} [data-testid="plankHeading.companion"] >> nth=0`, label: 'Companion' });
      }
      await demo.click({ selector: brainTab, label: 'Brain' });
      await demo.click({ selector: '[data-testid="agent-knowledge-tab-facts"] >> nth=0', label: 'Facts' });
      // The tab polls the brain; give EDGE's brain a few reads.
      await page.locator('[data-testid="agent-knowledge-fact"]').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(BEAT * 4);
    },
  },
];
