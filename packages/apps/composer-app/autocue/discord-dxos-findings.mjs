//
// Copyright 2026 DXOS.org
//

/**
 * From a space that holds only its Discord sign-in, index channels of the DXOS server, let the crawl run on EDGE,
 * query the facts it put into the space's memory, and have the agent report what that memory says as sheets with
 * charts, a deck and a summary.
 *
 * @title Back-index the DXOS Discord
 * @mdl packages/plugins/plugin-discord/spec/BACK-INDEX.mdl test QA-1
 * @app composer-app via `DX_PWA=false DX_EDGE_BASE_URL=http://localhost:8787 moon run composer-app:serve -- --port 4174`
 *   against a local EDGE stack (`pnpm stack:start` in the edge checkout), the browser joined to an identity whose space
 *   holds the Discord connection and is granted the DXOS server
 */

const CHANNELS = ['general', 'announcements', 'sdk', 'composer', 'help', 'interesting'];
const PLANK = '[data-testid="deck.plank"]';
const PROMPT = '[data-testid="assistant.prompt"] .cm-content';
const ACTIVITY = '[data-testid="assistant.chat-activity"]';
const SEED_STATEMENTS = 294;

const REQUEST =
  "Your space's memory holds facts extracted from the last year of the DXOS Discord server. Explore it and find the five most interesting things about this community. For each finding, create a sheet with the data you queried and a chart that fits it. Then create a presentation with a cover slide and each chart as a slide, and a separate markdown document summarising the five findings. Describe people by their role, never by name.";

/** The back-index section's totals line, e.g. "75 messages read · done · last run 11:36:40". */
const totals = (page) =>
  page.evaluate(() => {
    const match = document.body.innerText.match(/(\d+) messages read · (\w+) · last run/);
    return match ? { messages: Number(match[1]), status: match[2] } : undefined;
  });

/** How many statements the space's memory holds, read through Brain's fact store. */
const statements = (page) =>
  page.evaluate(async () => {
    const caps = globalThis.composer.manager.capabilities;
    const registry = caps.get({ identifier: 'org.dxos.plugin.brain.capability.factStoreRegistry' });
    const runtime = caps.get({ identifier: 'org.dxos.app-framework.capability.processManagerRuntime' });
    const spaceId = globalThis.dxos.client.spaces.get()[0].id;
    const rows = await runtime.runPromise(
      registry.forSpace(spaceId).rows('SELECT (COUNT(*) AS ?n) WHERE { GRAPH ?g { ?s ?p ?o } }'),
    );
    return Number(rows[0]?.n?.value ?? 0);
  });

/** Polls `probe` until `ready` holds for its value. */
const until = async (page, probe, ready, { timeout = 900_000, every = 3_000 } = {}) => {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await probe(page).catch(() => undefined);
    if (ready(value)) {
      return value;
    }
    await page.waitForTimeout(every);
  }
  throw new Error(`Timed out waiting; last value ${JSON.stringify(value)}`);
};

/** Resolves once the chat's activity line has been empty for `quiet` ms. */
const agentIdle = async (page, { quiet = 8_000, timeout = 1_200_000 } = {}) => {
  const deadline = Date.now() + timeout;
  let since = Date.now();
  while (Date.now() < deadline) {
    const busy = await page.evaluate(
      (selector) => (document.querySelector(selector)?.textContent?.trim() ?? '') !== '',
      ACTIVITY,
    );
    if (busy) {
      since = Date.now();
    } else if (Date.now() - since >= quiet) {
      return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('The agent was still working after the timeout.');
};

/** Objects of a type in the space, by name. */
const objectsOfType = (page, typename) =>
  page.evaluate(async (type) => {
    const space = globalThis.dxos.client.spaces.get()[0];
    const objects = await space.db.query(globalThis.dxos.Filter.everything()).run();
    return objects.filter((object) => globalThis.dxos.Obj.getTypename(object) === type).map((object) => object.name);
  }, typename);

/** The back-index trigger's input (channels, maxDays), or undefined before one exists. */
const backIndexInput = (page) =>
  page.evaluate(async () => {
    const space = globalThis.dxos.client.spaces.get()[0];
    const objects = await space.db.query(globalThis.dxos.Filter.everything()).run();
    const trigger = objects.find((object) => globalThis.dxos.Obj.getTypename(object) === 'org.dxos.type.trigger');
    return trigger ? JSON.parse(JSON.stringify(trigger.input ?? {})) : undefined;
  });

/** Whether the agent's last outputs exist: a presentation and a document other than the space's README. */
const findingsMade = async (page) =>
  (await objectsOfType(page, 'org.dxos.type.presentation')).length > 0 &&
  (await objectsOfType(page, 'org.dxos.type.document')).some((name) => name && name !== 'README');

const channelOption = (name) => `[role="option"]:has(p:text-matches("┆?${name}$"))`;

export const steps = [
  {
    name: 'Open the Discord connection',
    setup: true,
    done: async ({ page }) =>
      (await page.locator(PLANK).getByText('Servers to index into memory', { exact: true }).count()) > 0,
    run: async ({ page }) => {
      await page.getByRole('treeitem', { name: 'Home' }).first().click();
      await page.locator(PLANK).getByText('Discord', { exact: true }).first().click();
      await page.locator(PLANK).getByText('Servers to index into memory', { exact: true }).waitFor({ timeout: 30_000 });
    },
  },
  {
    name: 'Pick the channels',
    done: async ({ page }) => ((await backIndexInput(page))?.channels?.length ?? 0) >= CHANNELS.length,
    narration: 'On the Discord connection, the DXOS server is already granted; pick the channels to index.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Back-index the DXOS Discord', subtitle: 'local Composer · local EDGE', hold: 3600 });
      await demo.caption({
        value: 'Pick the channels to index',
        subtitle: 'Discord connection › Servers to index into memory',
      });
      await page.locator(PLANK).getByText('Servers to index into memory', { exact: true }).scrollIntoViewIfNeeded();
      await demo.click({ selector: `${PLANK} :text-is("DXOS")`, label: 'DXOS' });
      await page.locator(PLANK).getByText('Channels to index', { exact: true }).waitFor({ timeout: 30_000 });
      for (const channel of CHANNELS) {
        // The row's own button toggles indexing; its label changes once the channel is on.
        const toggle = `${channelOption(channel)} button[aria-label="Index into memory"]`;
        await page.locator(channelOption(channel)).first().scrollIntoViewIfNeeded();
        if ((await page.locator(toggle).count()) > 0) {
          await demo.click({ selector: toggle, label: `#${channel}` });
          await page.locator(toggle).first().waitFor({ state: 'detached', timeout: 30_000 });
        }
      }
      await page.locator(PLANK).getByText('Crawl back', { exact: true }).waitFor({ timeout: 30_000 });
    },
  },
  {
    name: 'Crawl back a year',
    done: async ({ page }) => (await backIndexInput(page))?.maxDays === 365,
    narration: 'Read the last year of each channel.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Crawl back a year',
        subtitle: 'the crawl runs every two minutes until it catches up',
      });
      const field = page.locator('.dx-field, [data-scope="field"]').filter({ hasText: 'Crawl back' }).first();
      await field.scrollIntoViewIfNeeded();
      await field.locator('button').first().click();
      await demo.click({ selector: '[role="option"]:has-text("365 days")', label: '365 days' });
      await page.waitForTimeout(1_000);
    },
  },
  {
    name: 'Run the crawl on EDGE',
    narration: 'Check now fires the back-index trigger, so the crawl runs on EDGE.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Check now runs the crawl on EDGE',
        subtitle: 'compute-service · DiscordService · MemoryService.put',
      });
      await demo.click({ selector: 'button:has-text("Check now")', label: 'Check now' });
      await demo.click({ selector: 'button[aria-label="Trace"]', label: 'Trace' });
      await demo.speed({ factor: 16 });
      await until(page, totals, (value) => value?.status === 'done' && value.messages > 0);
      // The facts reach the memory as each run stores them; wait for them past the seed vocabulary.
      await until(page, statements, (value) => value > SEED_STATEMENTS, { timeout: 1_200_000, every: 10_000 });
      await demo.speed({ factor: 1 });
      const { messages } = await totals(page);
      await demo.caption({ value: `${messages} messages read`, subtitle: 'facts are in the space memory' });
      await page.waitForTimeout(3_000);
    },
  },
  {
    name: 'Query the memory',
    narration: "Brain's Memory view queries the facts with SPARQL.",
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Query the memory', subtitle: 'Brain › Memory · SPARQL' });
      await demo.click({ selector: 'button[aria-label="Memory"]', label: 'Memory' });
      await page.locator('[data-testid="brain.memory.editor"]').waitFor({ timeout: 30_000 });
      await demo.click({ selector: 'button:has-text("Run")', label: 'Run' });
      await page.locator('[data-testid="brain.memory.results"]').waitFor({ timeout: 60_000 });
      await page.waitForTimeout(4_000);
    },
  },
  {
    name: 'Ask for findings',
    // Done once the last outputs exist: the deck and the summary come after the sheets.
    done: async ({ page }) => findingsMade(page),
    narration: 'The agent is asked what is interesting in the memory, and to report it as artifacts.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Ask the agent what the memory says',
        subtitle: 'brain, sheet, presenter and markdown skills',
      });
      // The space starts with no chat, so a chat means the request went out before a restart: wait for it, never resend.
      const sent = (await objectsOfType(page, 'org.dxos.type.assistant.chat')).length > 0;
      if (!sent) {
        await page.getByRole('treeitem', { name: 'Home' }).first().click();
        await page.locator(PROMPT).first().waitFor({ timeout: 30_000 });
        await demo.click({ selector: PROMPT, label: 'Prompt' });
        await demo.type({ selector: PROMPT, value: REQUEST, delay: 6 });
        await demo.press({ key: 'Enter', hud: false });
      }
      await demo.speed({ factor: 8 });
      await until(page, findingsMade, (made) => made === true, { timeout: 1_200_000, every: 10_000 });
      await agentIdle(page);
      await demo.speed({ factor: 1 });
    },
  },
  {
    name: 'Open the deck and a finding',
    narration: 'The deck the agent made of its charts, one of its sheets, and its summary.',
    run: async ({ demo, page }) => {
      // A type's navtree entry opens a plank of cards; a card opens the object. The agent picks the titles, so the
      // object is found by type: the newest of it, other than the space's own README.
      const open = async (group, typename) => {
        const names = (await objectsOfType(page, typename)).filter((name) => name && name !== 'README');
        const name = names.at(-1);
        if (!name) {
          throw new Error(`The agent made no ${typename}.`);
        }
        await demo.click({ selector: `[role="treeitem"]:has-text(${JSON.stringify(group)})`, label: group });
        const card = `${PLANK} :text-is(${JSON.stringify(name)})`;
        await page.locator(card).first().waitFor({ timeout: 30_000 });
        await demo.click({ selector: card, label: name });
        await page
          .locator(card)
          .first()
          .waitFor({ state: 'detached', timeout: 30_000 })
          .catch(() => undefined);
        await demo.sleep({ ms: 4_000 });
      };
      await demo.caption({ value: 'The deck it made of its charts', subtitle: 'presenter skill' });
      await open('Presentations', 'org.dxos.type.presentation');
      await demo.caption({ value: 'A finding: its data and its chart', subtitle: 'sheet skill' });
      await open('Sheets', 'org.dxos.type.sheet');
      await demo.caption({ value: 'And a summary of all five', subtitle: 'markdown skill' });
      await open('Documents', 'org.dxos.type.document');
    },
  },
];
