//
// Copyright 2026 DXOS.org
//

/**
 * Sixty days of the Cloudflare Developers Discord, crawled and turned into facts, are imported into a Composer
 * space's memory as TriG. Composer's own assistant, given the Brain skill, is asked what is interesting about the
 * community; the Memory panel beside the chat shows each SPARQL query the agent runs, with its rows, as it runs it,
 * and the agent builds sheets with charts, a deck and a summary from what it found. No finding is given to it.
 *
 * @title Findings from memory, in Composer
 * @mdl packages/plugins/plugin-brain/PLUGIN.mdl test QA-2
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`,
 *   with the TriG written by `moon run plugin-discord:facts -- trig <out.trig> --facts <cloudflare-60d facts.db>`
 *   at `$MEMORY_TRIG` (default `~/.local/share/dxos/discord-pipeline/cloudflare-60d/facts.trig`)
 * @driver `--caption-position middle --caption-background 0.45`
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

const SUBTITLE = 'plugin-brain/PLUGIN.mdl · QA-2';
const TRIG = process.env.MEMORY_TRIG ?? join(homedir(), '.local/share/dxos/discord-pipeline/cloudflare-60d/facts.trig');
const BRAIN = 'org.dxos.plugin.brain';

const PLANK = '[data-testid="deck.plank"]';
const PROMPT = `${PLANK} [data-testid="assistant.prompt"] .cm-content`;
const ACTIVITY = `${PLANK} [data-testid="assistant.chat-activity"]`;
/** A control of the Memory panel in the context sidebar. */
const MEMORY = (testId) => `[data-testid="brain.memory.${testId}"]`;

const REQUEST =
  "I imported sixty days of the Cloudflare Developers Discord into this space's memory. Find the five most interesting things about that community. For each one, make a sheet with the data and a chart, then a presentation of the charts and a short summary document. Describe people by their role, never by name.";

const caption = async (demo, value, subtitle = SUBTITLE) => {
  await demo.caption({ value, subtitle });
  await demo.sleep({ ms: 1_800 });
};

/** Invokes an operation once the app has booted far enough to serve it, retrying while it registers. */
const invokeWhenReady = async (page, key, input) => {
  await page.waitForFunction(() => globalThis.composer?.invoke, undefined, { timeout: 120_000 });
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

/** Resolves once the chat's activity line (Generating, Calling tool …) has been gone for `quiet` ms. */
const agentIdle = async (page, { quiet = 10_000, timeout = 1_800_000 } = {}) => {
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

/** A navtree row by its exact label. */
const TREE = (label) => `[data-testid="treeItem.heading"]:text-is(${JSON.stringify(label)}) >> visible=true`;

/** The names the agent gave the objects it made of `typename`, in the order it made them. */
const madeOf = (page, typename) =>
  page.evaluate(async (typename) => {
    const { client, Filter, Obj } = globalThis.__DXOS__;
    const space = client.spaces.default ?? client.spaces.get()[0];
    const objects = await space.db.query(Filter.everything()).run();
    return objects.filter((object) => Obj.getTypename(object) === typename).map((object) => object.name ?? '');
  }, typename);

/** A navtree branch row by its own heading; a parent's text includes its children's, so the heading is matched. */
const BRANCH = (label) =>
  `[data-part="branch-control"]:visible:has([data-testid="treeItem.heading"]:text-is(${JSON.stringify(label)}))`;

/** Opens a navtree branch by its chevron, unless it is open already; clicking the heading would open it as a plank. */
const expand = async (demo, page, label) => {
  const row = page.locator(BRANCH(label)).first();
  if (!(await row.isVisible().catch(() => false)) || (await row.getAttribute('data-state')) === 'open') {
    return;
  }
  await demo.click({ selector: `${BRANCH(label)} > div >> nth=0`, label });
  await page.waitForTimeout(800);
};

/** Opens an object the agent made; it files them in the space's root collection. */
const openInTree = async (demo, page, name) => {
  await expand(demo, page, 'Collections');
  await demo.click({ selector: `${TREE(name)} >> nth=0`, label: name });
};

/** Shows a sheet and its charts in the plank's Charts companion. */
const showSheet = async (demo, page, name, subtitle) => {
  await caption(demo, name, subtitle);
  await openInTree(demo, page, name);
  await page.locator('.dx-grid').first().waitFor({ state: 'visible', timeout: 20_000 });
  const tab = page.locator('[data-testid="deck.companion.tab.charts"]');
  if (!(await tab.isVisible().catch(() => false))) {
    await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Open companion' });
  }
  await demo.click({ selector: '[data-testid="deck.companion.tab.charts"]', label: 'Charts' });
  await page.locator('[data-testid="deck.companion"] svg').first().waitFor({ state: 'visible', timeout: 15_000 });
  await demo.sleep({ ms: 4_000 });
};

export const steps = [
  {
    name: 'Prep (off camera): enable Brain, open a chat with the Memory panel beside it',
    setup: true,
    done: async ({ page }) => (await page.locator(MEMORY('import')).count()) > 0,
    run: async ({ page }) => {
      await invokeWhenReady(page, 'org.dxos.operation.registry.enablePlugins', { ids: [BRAIN] });
      await page.waitForFunction((id) => globalThis.composer.manager.getEnabled().includes(id), BRAIN, {
        timeout: 30_000,
      });
      await page.waitForFunction(
        () => {
          const client = globalThis.__DXOS__?.client;
          return !!(client?.spaces.default ?? client?.spaces.get()[0]);
        },
        undefined,
        { timeout: 120_000 },
      );
      const url = await page.evaluate(async () => {
        const client = globalThis.__DXOS__.client;
        const space = client.spaces.default ?? client.spaces.get()[0];
        const options = { spaceId: space.id };
        const invoke = (key, input) => globalThis.composer.invoke(key, input, options);
        const { object: chat } = await invoke('org.dxos.operation.assistant.createChat', {
          name: 'Cloudflare community',
        });
        await invoke('org.dxos.operation.space.addObject', { object: chat });
        await space.db.flush();
        return `${location.origin}/w/${space.id}/db/org.dxos.type.assistant.chat+${chat.id}`;
      });
      await page.goto(url);
      await page.locator(PROMPT).waitFor({ state: 'visible', timeout: 60_000 });
      for (const selector of [
        '[data-testid="org.dxos.plugin.observability.notice"] button:not(:has-text("Settings"))',
        'li[role="status"]:has-text("Privacy Notice") button:has-text("Close")',
      ]) {
        const control = page.locator(selector);
        if (await control.count()) {
          await control.first().click();
        }
      }
      const help = page.locator('role=button[name="Close companion"]').first();
      if (await help.isVisible().catch(() => false)) {
        await help.click();
      }
      await page.locator('button[aria-label="Memory"]').first().click();
      await page.locator(MEMORY('import')).waitFor({ state: 'visible', timeout: 20_000 });
      await page.waitForTimeout(1_500);
    },
  },
  {
    name: "Import the community's memory",
    narration: "Sixty days of the Cloudflare Developers Discord, as facts, go into the space's memory as TriG.",
    run: async ({ demo, page }) => {
      await page.mouse.move(900, 500);
      await demo.cut();
      await demo.title({
        value: 'Findings from memory',
        subtitle: 'Composer · Cloudflare Developers Discord, 60 days',
        hold: 3_600,
      });
      await caption(demo, "Import the community's memory", 'TriG: Turtle with a named graph per fact');
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        demo.click({ selector: MEMORY('import'), label: 'Import TriG' }),
      ]);
      await chooser.setFiles(TRIG);
      await page.getByText(/Imported .* quads/).waitFor({ timeout: 120_000 });
      await demo.sleep({ ms: 2_500 });
    },
  },
  {
    name: 'See the run that filled the memory',
    narration: 'The memory also records the run that built it: channels read, stages, model calls, cost and time.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The run that filled it', 'Pipeline panel · drawn on a canvas from the memory');
      await demo.click({ selector: 'button[aria-label="Pipeline"]', label: 'Pipeline' });
      await page.locator('[data-testid="brain.pipeline.diagram"]').waitFor({ state: 'visible', timeout: 30_000 });
      await demo.sleep({ ms: 6_000 });
      await demo.click({ selector: 'button[aria-label="Memory"]', label: 'Memory' });
      await page.locator(MEMORY('import')).waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Give the chat the Brain skill',
    narration: 'The chat loads the Brain skill, which queries that memory.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Give the chat the Brain skill', '/ loads a skill into the chat');
      await demo.clearCaption();
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      await demo.type({ selector: PROMPT, value: '/brain', delay: 120 });
      await page.locator('.cm-tooltip-autocomplete').waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: 1_000 });
      await demo.press({ key: 'Enter' });
      await demo.press({ key: 'Enter' });
      await page
        .getByText(/Loaded the Brain skill/)
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Ask what is interesting about the community',
    narration:
      'Asked for five findings, the agent explores the memory with SPARQL; each query shows in the panel as it runs.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: PROMPT, label: 'Prompt' });
      await demo.type({ selector: PROMPT, value: REQUEST, delay: 6 });
      await demo.press({ key: 'Enter', hud: false });
      await caption(demo, 'Each query the agent runs shows in Memory, live', 'brain skill: Query SPARQL');
      await page.locator(MEMORY('query')).first().waitFor({ state: 'visible', timeout: 600_000 });
      await demo.sleep({ ms: 6_000 });
      await demo.speed({ factor: 8 });
      await agentIdle(page);
      await demo.speed({ factor: 1 });
      await demo.clearCaption();
    },
  },
  {
    name: 'Open the first finding',
    narration: 'Each finding is a sheet of the data the agent queried, with the chart it chose.',
    run: async ({ demo, page }) => {
      // The Memory panel has done its part; the sheets get the width.
      const sidebar = page.locator('[data-testid="deck.toggleComplementarySidebar"]');
      if ((await sidebar.getAttribute('aria-label').catch(() => null))?.startsWith('Close')) {
        await demo.click({ selector: '[data-testid="deck.toggleComplementarySidebar"]', label: 'Close sidebar' });
      }
      const [first] = await madeOf(page, 'org.dxos.type.sheet');
      await showSheet(demo, page, first, 'a sheet of the data it queried, and its chart');
    },
  },
  {
    name: 'Open another finding',
    narration: 'Another finding, charted the way the agent chose.',
    run: async ({ demo, page }) => {
      const sheets = await madeOf(page, 'org.dxos.type.sheet');
      await showSheet(demo, page, sheets[2] ?? sheets.at(-1), 'the agent picks the chart');
    },
  },
  {
    name: 'Read the deck',
    narration: 'The deck the agent made of its charts.',
    run: async ({ demo, page }) => {
      const [deck] = await madeOf(page, 'org.dxos.type.presentation');
      await caption(demo, deck, 'presenter skill');
      await openInTree(demo, page, deck);
      await demo.sleep({ ms: 5_000 });
    },
  },
  {
    name: 'Read the summary',
    narration: 'And its summary of the five findings.',
    run: async ({ demo, page }) => {
      const documents = (await madeOf(page, 'org.dxos.type.document')).filter((name) => name !== 'README');
      const summary = documents.at(-1);
      await caption(demo, summary, 'markdown skill');
      await openInTree(demo, page, summary);
      await demo.sleep({ ms: 5_000 });
      await demo.clearCaption();
    },
  },
];
