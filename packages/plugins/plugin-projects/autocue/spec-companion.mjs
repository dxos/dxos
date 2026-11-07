//
// Copyright 2026 DXOS.org
//

/**
 * A project's Specs tab shows a spec's text alone; its other views are three companion tabs, Structure, Decisions and
 * Review, each a toggle between the views plugins add to it. The spec is plugin-code's PLUGIN.mdl, whose types,
 * components and decisions fill every view.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-6
 * @app composer-app via `moon run composer-app:serve -- --port 5180 --strictPort`
 *
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --url http://localhost:5180 --out /tmp/demo
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in /tmp/demo/session.webm --out spec-companion.webm \
 *     --duration off --max-static 1 --caption-hold 2.5 --upload off
 */

import { readFileSync } from 'node:fs';

const SUBTITLE = 'from plugin-projects/PLUGIN.mdl QA-6';
const PROJECT = 'Code plugin';
const SPEC = 'CodePlugin';

/** plugin-code's spec, without the front matter the spec's own fields replace. */
const TEXT = readFileSync(new URL('../../plugin-code/PLUGIN.mdl', import.meta.url), 'utf8').replace(
  /^---\n[\s\S]*?\n---\n+/,
  '',
);

/** Time to read a caption before the gesture it describes. */
const READ = 2_500;

/** Time to look at what a gesture changed. */
const LOOK = 3_000;

const PLANK = '[data-testid="deck.plank"]';
const COMPANION = '[data-testid="deck.companion"]';
const DOCUMENT = '[data-testid="projectsPlugin.spec.document"]';
const EDITOR = `${DOCUMENT} .cm-content`;
const EXTENSIONS = '[data-testid="projectsPlugin.specExtensions"]';
const CHIP = '[data-testid="spec-changelog.gutter-chip"]';
const SPECS = '[role="listbox"][aria-label="Specs"]';
const row = (name) => `${SPECS} [role="group"]:has(> [data-part="legend"]:text-is("${name}"))`;
const field = (name, label) =>
  `${row(name)} [data-scope="field"][data-part="root"]:has(label:text-is("${label}")) :is(input, [contenteditable="true"])`;

const tab = (group) => `[data-testid="deck.companion.tab.spec-${group}"]`;
const body = (group) => `[data-testid="spec-companion.${group}"]`;
const toggle = (view) => `${COMPANION} [data-testid="spec-companion.view.${view}"]:visible`;

const caption = (demo, step, text) => demo.caption({ value: `Step ${step} — ${text}`, subtitle: SUBTITLE, hold: READ });

/** Waits for the tab of `group` to draw `view`. */
const waitForView = (page, group, view) =>
  page.waitForFunction(
    ([selector, view]) => [...document.querySelectorAll(selector)].some((node) => node.dataset.view === view),
    [body(group), view],
    { timeout: 15_000 },
  );

const showView = async (demo, page, group, view, label) => {
  await demo.click({ selector: toggle(view), label });
  await waitForView(page, group, view);
  await demo.sleep({ ms: LOOK });
};

const expectCount = async (page, selector, count, what) => {
  const seen = await page.locator(selector).count();
  if (seen !== count) {
    throw new Error(`expected ${count} ${what}, saw ${seen}`);
  }
};

/** Whether the spec holds the text; the editor draws only the lines in view, so either end will do. */
const hasSpecText = async (page) =>
  (await page.locator(`${EDITOR}:is(:has-text("plugin CodePlugin"), :has-text("decision D-"))`).count()) > 0;

/** Scrolls the spec's text a notch at a time until `selector` is in its upper half. */
const scrollDocumentTo = async (page, selector) => {
  const box = await page.locator(DOCUMENT).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const target = page.locator(selector);
  for (let notch = 0; notch < 60; notch++) {
    const top = (await target.count()) > 0 ? (await target.first().boundingBox())?.y : undefined;
    if (top !== undefined && top > box.y && top < box.y + box.height * 0.5) {
      return;
    }
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(120);
  }
  throw new Error(`never scrolled to ${selector}`);
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices, enable Code',
    setup: true,
    run: async ({ page }) => {
      // Code is off by default; it draws a spec's text and contributes most of its views.
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.code'] }),
      );
      await page.waitForFunction(
        () => composer.plugins().some((plugin) => plugin.id === 'org.dxos.plugin.code' && plugin.active),
        undefined,
        { timeout: 30_000 },
      );
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
      await page.locator(PLANK).first().waitFor({ timeout: 30_000 });
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Prep (off camera): create the project',
    setup: true,
    done: async ({ page }) => (await page.locator(PLANK, { hasText: PROJECT }).count()) > 0,
    run: async ({ page }) => {
      await page.locator('[data-testid="spacePlugin.createObject"]').first().click();
      await page.locator('[data-testid="create-object-form.type.org.dxos.type.project"]').click();
      await page.locator('[data-testid="create-project-panel.name-input"]').fill(PROJECT);
      await page.locator('[role="option"][data-value="org.dxos.project.default"]').click();
      await page.locator('[role="dialog"] [data-testid="save-button"]').click();
      await page.locator('[data-testid="projectsPlugin.tab.overview"]').first().waitFor({ timeout: 30_000 });
    },
  },
  {
    name: 'Prep (off camera): add the spec',
    setup: true,
    done: async ({ page }) => (await page.locator(row(SPEC)).count()) > 0,
    run: async ({ page }) => {
      await page.locator('[data-testid="projectsPlugin.tab.overview"]').first().click();
      await page.locator('[data-testid="specs.add"]').first().click();
      const name = page.locator(field('Untitled', 'Name')).first();
      await name.waitFor({ state: 'visible', timeout: 10_000 });
      await name.click();
      await page.keyboard.type(SPEC);
      await page.locator(row(SPEC)).waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Prep (off camera): write the spec',
    setup: true,
    done: ({ page }) => hasSpecText(page),
    run: async ({ page }) => {
      await page.locator('[data-testid="projectsPlugin.tab.spec"]').first().click();
      await page.locator(EDITOR).first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator(EDITOR).first().click();
      await page.evaluate(
        ([selector, text]) => {
          const data = new DataTransfer();
          data.setData('text/plain', text);
          document
            .querySelector(selector)
            .dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
        },
        [EDITOR, TEXT],
      );
      if (!(await hasSpecText(page))) {
        throw new Error('the paste left the spec empty');
      }
      await page.keyboard.press('ControlOrMeta+Home');
    },
  },
  {
    name: 'Prep (off camera): show the project on its Specs tab',
    setup: true,
    run: async ({ page }) => {
      await page.locator('[data-testid="projectsPlugin.tab.spec"]').first().click();
      const close = page.locator('[data-testid="plankHeading.closeCompanion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
      await page.locator('[data-testid="spec-article.spec"]').first().waitFor({ state: 'visible', timeout: 15_000 });
      await page.locator(EDITOR).first().click();
      await page.keyboard.press('ControlOrMeta+Home');
      await page.waitForTimeout(2_000);
    },
  },
  {
    name: 'Open the Specs tab',
    narration: "A project's Specs tab is the spec's text, and nothing else.",
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Spec companion', subtitle: 'Every view of a spec beside its text' });
      await caption(demo, 1, "The Specs tab shows the spec's text, with no view toggle");
      await expectCount(page, `${PLANK} [data-testid^="projectsPlugin.specView."]`, 0, 'view toggles');
      await demo.hover({ selector: EXTENSIONS, label: 'Extensions' });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Open the Structure tab',
    narration: 'Its other views are companion tabs: Structure, Decisions and Review.',
    run: async ({ demo, page }) => {
      await caption(demo, 2, 'The companion holds three tabs: Structure, Decisions and Review');
      await demo.click({ selector: '[data-testid="plankHeading.companion"] >> nth=0', label: 'Companion' });
      await page.locator(tab('structure')).waitFor({ state: 'visible', timeout: 10_000 });
      if (!page.url().endsWith('/companion/spec-structure')) {
        await demo.click({ selector: tab('structure'), label: 'Structure' });
      }
      await waitForView(page, 'structure', 'definitions');
      await expectCount(page, tab('decisions'), 1, 'Decisions tabs');
      await expectCount(page, tab('review'), 1, 'Review tabs');
      await caption(demo, 2, 'Structure draws the definitions the spec declares');
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Switch the Structure views',
    narration: 'Structure switches between the definitions graph, the data model and the API.',
    run: async ({ demo, page }) => {
      await caption(demo, 3, 'Its toggle switches to the data model, then the API');
      await showView(demo, page, 'structure', 'data', 'Data model');
      await showView(demo, page, 'structure', 'api', 'API');
    },
  },
  {
    name: 'Give the spec the software package',
    narration: 'Checking the Software package adds the views another plugin gives that dialect.',
    run: async ({ demo, page }) => {
      await caption(demo, 4, 'Checking Software in Extensions adds its views to Structure');
      await expectCount(page, toggle('canvas'), 0, 'Canvas toggles');
      await demo.click({ selector: `${EXTENSIONS} >> nth=0`, label: 'Extensions' });
      await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5_000 });
      await demo.click({
        selector: '[role="menu"] >> [role="menuitemcheckbox"]:has-text("Software")',
        label: 'Software',
      });
      await page.locator(toggle('canvas')).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.press({ key: 'Escape' });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Show the canvas and the board',
    narration: 'The canvas and the board now sit beside the definitions.',
    run: async ({ demo, page }) => {
      await caption(demo, 5, 'Canvas and Board now sit beside the definitions');
      await showView(demo, page, 'structure', 'canvas', 'Canvas');
      await showView(demo, page, 'structure', 'kanban', 'Board');
      await demo.click({ selector: toggle('definitions'), label: 'Definitions' });
      await waitForView(page, 'structure', 'definitions');
    },
  },
  {
    name: 'Open the Decisions tab',
    narration: "Decisions lists the spec's changelog, and draws who decided what.",
    run: async ({ demo, page }) => {
      await caption(demo, 6, "Decisions lists the spec's changelog, then draws its decisions");
      await demo.click({ selector: tab('decisions'), label: 'Decisions' });
      await page.locator(body('decisions')).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: LOOK });
      await showView(demo, page, 'decisions', 'decisions', 'Decisions');
    },
  },
  {
    name: 'Show a decision from the margin',
    narration: 'A chip in the margin opens the decision behind a requirement.',
    run: async ({ demo, page }) => {
      await caption(demo, 7, 'A chip in the margin shows the decision behind a requirement');
      await showView(demo, page, 'decisions', 'log', 'Log');
      await scrollDocumentTo(page, `${EDITOR} ${CHIP}`);
      await demo.click({ selector: `${EDITOR} ${CHIP} >> nth=0`, label: 'Decision' });
      await waitForView(page, 'decisions', 'decisions');
      await demo.sleep({ ms: LOOK + 1_000 });
    },
  },
  {
    name: 'Open the Review tab',
    narration: 'Review holds the latest compliance review, and the code it cites.',
    run: async ({ demo, page }) => {
      await caption(demo, 8, 'Review holds the compliance review and the code it cites');
      await demo.click({ selector: tab('review'), label: 'Review' });
      await waitForView(page, 'review', 'review');
      await page.locator(toggle('code')).waitFor({ state: 'visible', timeout: 10_000 });
      await demo.sleep({ ms: LOOK });
    },
  },
  {
    name: 'Back to the structure',
    narration: 'The text and its views are one spec object, so peers and agents editing it see every tab follow along.',
    run: async ({ demo, page }) => {
      await caption(demo, 9, 'One spec, its text in the main area and every view beside it');
      await demo.click({ selector: tab('structure'), label: 'Structure' });
      await waitForView(page, 'structure', 'definitions');
      await demo.clearCaption();
      await demo.sleep({ ms: 8_000 });
    },
  },
];
