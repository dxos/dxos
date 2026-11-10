//
// Copyright 2026 DXOS.org
//

/**
 * Everything about BlueYard from Composer: a Research opened on an existing entity session shows BlueYard's graph —
 * partners, funds and portfolio companies as cards with pictures; a portfolio company opens in the companion with
 * its facts, where they came from, and its relations; the Results view lists the investments as logo cards; the
 * Trace shows what the session spent.
 *
 * @mdl packages/plugins/plugin-lighthouse/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 5173`,
 *   against a lighthouse daemon on http://127.0.0.1:4319 holding the session LIGHTHOUSE_DEMO_RUN (default
 *   vc-blueyard-entity). The setup steps are research.mjs's (enable the plugin, connect lighthouse; the API token is
 *   read from the workspace's `api-token` file and never logged). Read-only: no session is started.
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5173 --out /tmp/demo
 *   C '{"op":"run","file":"packages/plugins/plugin-lighthouse/autocue/blueyard.mjs"}'
 */

import { steps as research } from './research.mjs';

const SUBTITLE = 'from plugin-lighthouse/PLUGIN.mdl QA-3';
const RUN = process.env.LIGHTHOUSE_DEMO_RUN ?? 'vc-blueyard-entity';
const NAME = 'BlueYard';
/** Portfolio companies with logos, in order of preference. */
const COMPANIES = ['IonQ', 'Privy', 'Protocol Labs', 'Castelion'];

const BEAT = 2_500;

/** The company step 4 opened, for the refocus that follows. */
let opened;

const PLANK = '[data-testid="deck.plank"]';
/** The article's graph cards; the companion's Relations graph reuses the same test id outside the plank. */
const NODE = `${PLANK} [data-testid="lighthouse.graph.node"]`;
const ROOT = `${NODE}[data-root]`;
const RESULT = '[data-testid="lighthouse.result"]';
const DETAIL = '[data-testid="lighthouse.detail"]';

const caption = (demo, step, text) =>
  demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, position: 'top' });

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

const view = (label) => `${PLANK} [role="radio"][aria-label="${label}"]`;

/** Waits until at least `count` images inside `selector` have loaded. */
const waitForImages = (page, selector, count, timeout = 30_000) =>
  page
    .waitForFunction(
      ([sel, expected]) =>
        [...document.querySelectorAll(sel)].filter((img) => img.complete && img.naturalWidth > 0).length >= expected,
      [`${selector} img`, count],
      { timeout },
    )
    .catch(() => {});

/** A selector for the graph card of the first preferred company on screen, else of any non-root card with a logo. */
const companyNode = (page) =>
  page.evaluate(
    ([node, names]) => {
      const cards = [...document.querySelectorAll(node)].filter((card) => !card.hasAttribute('data-root'));
      const withLogo = (card) => [...card.querySelectorAll('img')].some((img) => img.complete && img.naturalWidth > 0);
      for (const name of names) {
        const card = cards.find((card) => withLogo(card) && card.textContent.includes(name));
        if (card) {
          return { iri: card.getAttribute('data-iri'), name };
        }
      }
      const card = cards.find(withLogo);
      return card ? { iri: card.getAttribute('data-iri'), name: card.textContent.trim().slice(0, 40) } : undefined;
    },
    [NODE, COMPANIES],
  );

export const steps = [
  // Enable the plugin and connect lighthouse, as QA-1 does.
  ...research.filter((step) => step.setup),
  {
    name: 'Open Composer',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Everything about BlueYard', subtitle: 'An entity research in Composer' });
      await caption(demo, 1, 'Open Composer on the space');
      await demo.click({ selector: '[data-testid="treeItem.heading"]:text-is("Home")', label: 'Home' });
      await page.locator('[data-testid="spacePlugin.createObject"]').first().waitFor({ timeout: 15_000 });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Create a Research on the existing BlueYard session',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'Open the BlueYard research: a session started from the CLI');
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"]', label: 'Create' });
      await demo.click({
        selector: '[data-testid="create-object-form.type.org.dxos.type.lighthouse.Research"]',
        label: 'Research',
      });
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().waitFor({ timeout: 10_000 });
      await demo.fill({ selector: '[role="dialog"] input >> nth=0', value: NAME });
      // The second field, "Existing session", takes a lighthouse run id.
      await demo.type({ selector: '[role="dialog"] input >> nth=1', value: RUN, delay: 30, label: 'Existing session' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Create' });
      await dialog.waitFor({ state: 'hidden', timeout: 15_000 });
    },
  },
  {
    name: 'Look at BlueYard in the middle of its graph',
    run: async ({ demo, page }) => {
      // An entity session opens on its graph.
      await page.locator(ROOT).first().waitFor({ timeout: 90_000 });
      await waitForImages(page, NODE, 6);
      await page.waitForTimeout(4_000);
      if (await visible(page.locator('[data-testid="lighthouse.graph.fit"]'), 1_000)) {
        await page.locator('[data-testid="lighthouse.graph.fit"]').first().click();
      }
      await caption(demo, 3, 'BlueYard in the middle: partners, funds and portfolio companies');
      await demo.sleep({ ms: 4_000 });
      // About a hundred cards: zoom in on BlueYard so its neighbours read.
      const box = await page.locator(ROOT).first().boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        for (let i = 0; i < 6; i++) {
          await page.mouse.wheel(0, -200);
          await page.waitForTimeout(150);
        }
      }
      await demo.sleep({ ms: 4_000 });
      await demo.hover({ selector: `${ROOT} >> nth=0`, label: 'BlueYard' });
      await demo.sleep({ ms: BEAT });
    },
  },
  {
    name: 'Open a portfolio company with a logo',
    run: async ({ demo, page }) => {
      const company = await companyNode(page);
      if (!company) {
        throw new Error('no portfolio company with a logo on the graph');
      }
      opened = company;
      const selector = `${NODE}[data-iri="${company.iri}"]`;
      await caption(demo, 4, `Open ${company.name}: its facts, where they came from, its relations`);
      await demo.click({ selector, label: company.name });
      await page.locator(`${DETAIL} [data-testid="lighthouse.facts"]`).first().waitFor({ timeout: 30_000 });
      await demo.sleep({ ms: BEAT * 2 });
      const provenance = page.locator(`${DETAIL} :text("Where these facts came from")`).first();
      if (await visible(provenance, 2_000)) {
        await provenance.evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'smooth' }));
        await demo.sleep({ ms: BEAT * 2 });
      }
      const relations = page.locator('[data-testid="lighthouse.relations"]').first();
      if (await visible(relations, 5_000)) {
        await relations.evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'smooth' }));
        await demo.sleep({ ms: BEAT * 2 });
      }
    },
  },
  {
    name: 'Refocus the graph on the company, then go back to BlueYard',
    run: async ({ demo, page }) => {
      const company = opened?.name;
      const iri = opened?.iri;
      const selector = `${NODE}[data-iri="${iri}"]`;
      await caption(demo, 5, `Double-click: the graph refocuses on ${company ?? 'the company'}`);
      await demo.hover({ selector, label: 'Double-click' });
      await page.locator(selector).first().dblclick();
      // The refocused neighbourhood is fetched live (~5 s) and replaces BlueYard's.
      await page
        .waitForFunction(
          ([root, target]) => document.querySelector(root)?.getAttribute('data-iri') === target,
          [ROOT, iri],
          { timeout: 30_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(4_000);
      await demo.sleep({ ms: 5_000 });
      const back = `${PLANK} button[aria-label="Back to subjects"]`;
      if (await visible(page.locator(back), 3_000)) {
        await caption(demo, 5, 'Back to BlueYard');
        await demo.click({ selector: back, label: 'Back to subjects' });
        await page.waitForTimeout(3_000);
        await demo.sleep({ ms: BEAT });
      }
    },
  },
  {
    name: 'Switch to the Results: the investments as cards',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Results: the portfolio as cards, with their logos');
      await demo.click({ selector: view('Results'), label: 'Results' });
      await page.locator(RESULT).first().waitFor({ timeout: 30_000 });
      await demo.sleep({ ms: BEAT });
      await waitForImages(page, RESULT, 6);
      await demo.sleep({ ms: 5_000 });
    },
  },
  {
    name: 'Open the Trace briefly',
    run: async ({ demo, page }) => {
      await caption(demo, 7, 'Trace: every turn, call and page the research took');
      await demo.click({ selector: view('Trace'), label: 'Trace' });
      await page.locator('[data-testid="lighthouse.trace.row"]').first().waitFor({ timeout: 60_000 });
      await demo.sleep({ ms: 5_000 });
    },
  },
];
