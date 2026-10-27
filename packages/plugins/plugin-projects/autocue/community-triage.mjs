//
// Copyright 2026 DXOS.org
//

/**
 * A community Discord channel triaged into a project in Composer: the routine drafts a reply to each question
 * and files the work each message asks for, and the tasks fill in live.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-7
 * @app composer-app bundled build, served by `vite preview` on :4173, opened with `?model=scripted`
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/driver.mjs --url 'http://localhost:4173/?model=scripted' --out <out>
 *
 * The space comes from plugin-debug's Community support template, which the setup step enables; the scripted
 * model answers `TriageMessages` from that template's script, so the take needs no account or network model.
 */

const BEAT = 1_200;

const SPACE = 'Community support';
const TEMPLATE = 'org.dxos.plugin-debug.template.community';
const PLANK = '[data-testid="deck.plank"]';
const TREE_ITEM = (label) => `[role="treeitem"]:has-text("${label}") >> visible=true`;
const TASK_ROW = `${PLANK} [data-testid="taskList.item"]`;

/** Expands a navigation-tree branch when it is closed, so the items under it show. */
const expand = async (demo, page, label) => {
  const closed = page.locator(`[role="treeitem"][data-state="closed"]:has-text("${label}")`).first();
  if (await closed.isVisible().catch(() => false)) {
    // The disclosure toggle, not the label: a click on the label opens the branch in a plank instead.
    await demo.click({ selector: `${TREE_ITEM(label)} >> nth=0 >> [data-part="branch-trigger"] >> nth=0`, label });
    await page.waitForTimeout(BEAT / 2);
  }
};

/** Starts the space's triage routine through the operation invoker, without waiting for it, so the take sees it run. */
const runTriage = (page) =>
  page.evaluate(async (name) => {
    const space = dxos.spaces().find((candidate) => candidate.properties?.name === name);
    const routine = (await space.db.query(dxos.Filter.everything()).run()).find(
      (object) => dxos.Obj.getTypename(object) === 'org.dxos.type.routine',
    );
    const manager = composer.manager;
    const definition = manager.capabilities
      .getAll({ identifier: 'org.dxos.app-framework.capability.operationHandler' })
      .flatMap((set) => set.definitions())
      .find((candidate) => String(candidate.meta.key).endsWith('routine.runAutomation'));
    const invoker = manager.capabilities.get({ identifier: 'org.dxos.app-framework.capability.operationInvoker' });
    void invoker.invokePromise(definition, { routine: dxos.Ref.make(routine) }, { spaceId: space.id });
  }, SPACE);

export const steps = [
  {
    name: 'Prep (off camera): create the Community support space and open it',
    setup: true,
    run: async ({ page }) => {
      await page.waitForFunction(() => !!globalThis.composer, null, { timeout: 120_000 });
      await page.evaluate(() =>
        composer.invoke('org.dxos.operation.registry.enablePlugins', { ids: ['org.dxos.plugin.debug'] }),
      );
      await page.waitForTimeout(3_000);
      await page.evaluate(
        ([name, template]) => composer.invoke('org.dxos.operation.space.create', { name, template }),
        [SPACE, TEMPLATE],
      );
      await page.locator(`[data-testid="navtree.workspaces"] :text("${SPACE}")`).first().click({ force: true });
      await page.locator(TREE_ITEM('Projects')).first().waitFor({ timeout: 30_000 });
      const close = page.locator('[data-testid="plankHeading.closeCompanion"]');
      if (
        await close
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await close.first().click();
      }
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Open the synced channel',
    narration: 'A community Discord channel, synced into Composer: questions, a bug, a feature request, and hellos.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Discord → project', subtitle: 'replies to review, work as tasks', hold: 3_000 });
      await demo.caption({
        value: 'The community #general channel, synced into Composer',
        subtitle: 'QA-7 · plugin-projects',
      });
      await expand(demo, page, 'Channels');
      await demo.click({ selector: `${TREE_ITEM('#general')} >> nth=0`, label: '#general' });
      await page.locator(`${PLANK}:has-text("hello from Lisbon")`).first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(BEAT * 2.5);
    },
  },
  {
    name: "Open the project's tasks",
    narration: 'The Community project starts with no tasks.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'The Community project starts with no tasks' });
      await expand(demo, page, 'Projects');
      await demo.click({ selector: `${TREE_ITEM('Community')} >> nth=-1`, label: 'Community' });
      await demo.click({ selector: `${PLANK} [data-testid="projectsPlugin.tab.tasks"]`, label: 'Tasks' });
      await page.locator(`${PLANK} input[placeholder="Add task"]`).first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Run the triage routine and watch the tasks arrive',
    narration: 'Its routine reads each message: a question gets a drafted reply, and the work becomes a task.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'The "Triage #general" routine reads each message',
        subtitle: 'a feed trigger on the channel · model scripted for the demo',
      });
      await runTriage(page);
      await page.locator(TASK_ROW).nth(8).waitFor({ state: 'visible', timeout: 60_000 });
      await demo.caption({ value: '3 replies to review and 6 tasks, filed from 8 messages' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Open a drafted reply',
    narration: 'Every drafted reply waits for a person: nothing is posted to Discord on its own.',
    run: async ({ demo, page }) => {
      await demo.caption({
        value: 'Each drafted reply waits for a person to review it',
        subtitle: 'nothing is posted on its own',
      });
      await demo.click({
        selector: `${TASK_ROW}:has-text("Reply to Ivo") >> [data-testid="taskList.item.title"]`,
        label: 'Reply to Ivo',
      });
      await page.locator('[data-testid="deck.companion"]:has-text("Draft reply")').first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(BEAT * 3);
    },
  },
];
