//
// Copyright 2026 DXOS.org
//

/**
 * Create a project, brief its agent, break the work into tasks, fill one in, and select tasks for the agent.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-4
 * @app composer-app bundled dev build, served by `vite preview` on :4173
 *
 *   export DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
 *   moon run composer-app:bundle
 *   pnpm exec vite preview --configLoader native --port 4173 --strictPort
 *
 * Record on a fresh profile; produce the cut with the Composer intro and a narrated voice-over:
 *
 *   node .agents/skills/autocue/scripts/trim-static.mjs --in <out>/session.webm --out projects.webm \
 *     --ident composer --voiceover steps --mp4 --screenshot
 */

/** A beat for the viewer after a visible change. */
const BEAT = 1_200;

const TITLE = 'Roastery Ops';
const DESCRIPTION = 'Keep the roastery running: equipment, supplies and staff.';
const INSTRUCTION = "Check the roasters' service log before planning any maintenance.";
const TASKS = ['Service both roasters', 'Order green beans', 'Hire a roastery assistant'];
const TASK_DESCRIPTION = 'Clean the drums and replace the chaff filters.';

const PLANK = '[data-testid="deck.plank"]';
const COMPANION = '[data-testid="deck.companion"]';
const INSTRUCTIONS = `${PLANK} .cm-content[aria-placeholder="Describe what the agent should do in each session."]`;
const ADD_TASK = `${PLANK} input[placeholder="Add task"]`;
const TASK_ROW = `${PLANK} [data-testid="taskList.item"]`;

/** Types as a person would, a character at a time. */
const typeSlowly = (page, text, delay = 60) => page.keyboard.type(text, { delay });

/** Ends typing in an editor with one blank line, so it never stops mid-line on camera. */
const finishTyping = async (page) => {
  for (let line = 0; line < 2; line++) {
    await page.keyboard.press('Enter', { delay: 120 });
  }
};

/** Picks `value` from the menu a task property opens. */
const pickProperty = async (demo, page, property, value) => {
  await demo.click({
    selector: `${COMPANION} [data-testid="taskList.property.${property}"] >> nth=0`,
    label: property,
  });
  const option = `[role="menuitemradio"]:has-text("${value}")`;
  await page.locator(option).first().waitFor({ state: 'visible', timeout: 5_000 });
  await demo.click({ selector: `${option} >> nth=0`, label: value });
};

export const steps = [
  {
    name: 'Prep (off camera): dismiss notices and close the help panel',
    setup: true,
    run: async ({ page }) => {
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
      await page.locator(`${PLANK}[data-attendable-id$="/home"]`).first().waitFor();
      const close = page.locator('role=button[name="Close companion"]').first();
      if (await close.isVisible().catch(() => false)) {
        await close.click();
      }
    },
  },
  {
    name: 'Create a project',
    narration: 'Start a project for long-running work, from a template or from scratch.',
    done: async ({ page }) => (await page.locator(PLANK, { hasText: TITLE }).count()) > 0,
    run: async ({ demo, page }) => {
      await demo.click({ selector: '[data-testid="spacePlugin.createObject"] >> nth=0', label: 'Add to space' });
      await demo.click({ selector: '[data-testid="create-object-form.type.org.dxos.type.project"]', label: 'Project' });
      await demo.type({ selector: '[data-testid="create-project-panel.name-input"]', value: TITLE, label: 'Title' });
      await demo.click({ selector: '[role="option"][data-value="org.dxos.project.default"]', label: 'Default' });
      await demo.click({ selector: '[role="dialog"] [data-testid="save-button"]', label: 'Save' });
      await page.locator(INSTRUCTIONS).first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: "Brief the project's agent",
    narration: 'Describe it, and brief the agent that works on it.',
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${PLANK} textarea[placeholder="Description"] >> nth=0`, label: 'Description' });
      await typeSlowly(page, DESCRIPTION);
      await page.waitForTimeout(BEAT / 2);
      await demo.click({ selector: `${INSTRUCTIONS} >> nth=0`, label: 'Instructions' });
      await page.keyboard.press('ControlOrMeta+End');
      await finishTyping(page);
      await typeSlowly(page, INSTRUCTION);
      await finishTyping(page);
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Break the work into tasks',
    narration: 'Break the work down into tasks.',
    done: async ({ page }) => (await page.locator(TASK_ROW).count()) >= TASKS.length,
    run: async ({ demo, page }) => {
      await demo.click({ selector: `${PLANK} [data-testid="projectsPlugin.tab.tasks"]`, label: 'Tasks' });
      await page.locator(ADD_TASK).first().waitFor({ state: 'visible', timeout: 10_000 });
      for (const [index, task] of TASKS.entries()) {
        await demo.type({ selector: `${ADD_TASK} >> nth=0`, value: task, label: 'Add task' });
        await demo.press({ key: 'Enter', hud: false });
        await page.locator(TASK_ROW).nth(index).waitFor({ state: 'visible', timeout: 10_000 });
      }
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Fill in a task',
    narration: 'Open a task to add detail, set its priority, and track its status.',
    run: async ({ demo, page }) => {
      await demo.click({
        selector: `${TASK_ROW}:has-text("${TASKS[0]}") >> [data-testid="taskList.item.title"]`,
        label: TASKS[0],
      });
      const editor = `${COMPANION} .cm-content[aria-placeholder="Description"]`;
      await page.locator(editor).first().waitFor({ state: 'visible', timeout: 10_000 });
      await demo.click({ selector: `${editor} >> nth=0`, label: 'Description' });
      await typeSlowly(page, TASK_DESCRIPTION);
      await finishTyping(page);
      await pickProperty(demo, page, 'priority', 'High');
      await pickProperty(demo, page, 'status', 'Started');
      await page.locator(`${COMPANION} :text("Priority set to high")`).first().waitFor({ timeout: 10_000 });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Select tasks for the agent',
    narration: 'Select tasks to hand them to an AI agent.',
    run: async ({ demo, page }) => {
      for (const task of TASKS.slice(1)) {
        await demo.click({
          selector: `${TASK_ROW}:has-text("${task}") >> [data-testid="taskList.item.checkbox"]`,
          label: 'Select task',
        });
      }
      const delegate = `${PLANK} [data-testid="projectsPlugin.delegateTasks"]`;
      await page.waitForFunction((selector) => document.querySelector(selector)?.disabled === false, delegate, {
        timeout: 10_000,
      });
      await demo.hover({ selector: delegate, label: 'Assign selected tasks to agent' });
      await page.waitForTimeout(BEAT * 2);
    },
  },
  {
    name: 'Close on the planned project',
    narration:
      'People and AI agents work on the same project and tasks in real time, and your edits keep working offline.',
    run: async ({ page }) => {
      await page.waitForTimeout(BEAT * 9);
    },
  },
];
