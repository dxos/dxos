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

const PLANK = '[data-testid="deck.plank"]';
const NODE = '[data-testid="lighthouse.graph.node"]';
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
    name: 'Switch to the Results: the investments as cards',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Results: the funds, then the portfolio companies with their logos');
      await demo.click({ selector: view('Results'), label: 'Results' });
      await page.locator(RESULT).first().waitFor({ timeout: 30_000 });
      await demo.sleep({ ms: BEAT });
      // The agent's picks lead, then the funds (no pictures); scroll to the first ranked company with a logo.
      const index = await page.evaluate(
        (selector) =>
          [...document.querySelectorAll(selector)].findIndex(
            (card) =>
              !/PICK #/i.test(card.textContent) &&
              [...card.querySelectorAll('img')].some((img) => img.complete && img.naturalWidth > 0),
          ),
        RESULT,
      );
      if (index > 0) {
        await page
          .locator(RESULT)
          .nth(index)
          .evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'smooth' }));
      }
      await waitForImages(page, RESULT, 6);
      await demo.sleep({ ms: 5_000 });
    },
  },
  {
    name: 'Open the Trace briefly',
    run: async ({ demo, page }) => {
      await caption(demo, 6, 'Trace: every turn, call and page the research took');
      await demo.click({ selector: view('Trace'), label: 'Trace' });
      await page.locator('[data-testid="lighthouse.trace.row"]').first().waitFor({ timeout: 60_000 });
      await demo.sleep({ ms: 5_000 });
    },
  },
];
