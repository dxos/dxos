//
// Copyright 2026 DXOS.org
//

/**
 * Report an issue from the Feedback & Support sidebar to a local project, with logs and a screenshot attached.
 *
 * @mdl packages/plugins/plugin-support/PLUGIN.mdl test QA-3
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:serve -- --port 4173`
 */

const SUBTITLE = 'from plugin-support/PLUGIN.mdl QA-3';

export const steps = [
  {
    name: 'Prepare the workspace',
    setup: true,
    run: async ({ page }) => {
      // A reload resets the form and the deck to a known layout.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText('Home', { exact: true }).first().waitFor({ state: 'visible', timeout: 120_000 });
      await page.getByText('Home', { exact: true }).first().click();
      await page.locator('[data-testid="deck.plank"]').first().waitFor({ state: 'visible', timeout: 60_000 });
      await page.waitForTimeout(3000);
      const companion = page.locator('button:has-text("Close companion")');
      if (await companion.count()) {
        await companion.first().click();
      }
      const toast = page.locator(
        'li[role="status"]:has-text("Privacy Notice") button:not([data-testid="toast.action"])',
      );
      if (await toast.count()) {
        await toast.first().click();
      }
      if (!(await page.evaluate(() => document.body.innerText.includes('Composer Bugs')))) {
        throw new Error('"Composer Bugs" is missing: create it with org.dxos.operation.projects.create first.');
      }
      // The take starts from a closed sidebar, so opening it is on camera.
      if (await page.locator('[data-testid="report-to-project"]:visible').count()) {
        await page.locator('button:has-text("Feedback & Support")').first().click();
      }
      await page.waitForTimeout(1000);
    },
  },
  {
    name: 'Open the help companion',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 1 — Open Feedback & Support', subtitle: SUBTITLE });
      await demo.click({ selector: 'button:has-text("Feedback & Support")', label: 'Feedback & Support' });
      await page.locator('[data-testid="report-to-project"]').waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Fill in the report',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 2 — Describe the issue and attach a screenshot', subtitle: SUBTITLE });
      await demo.type({
        selector: 'input[placeholder="Short summary of the issue."]',
        value: 'Kanban card drag snaps back',
      });
      await demo.fill({
        selector: 'textarea[placeholder^="Please describe"]',
        value: 'Dragging a card to another column snaps it back to its original lane.',
      });
      await demo.click({ text: 'Attach screenshot', exact: true, label: 'Attach screenshot' });
      await page.locator('[data-testid="report-to-project-button"]:not([disabled])').waitFor({ timeout: 10_000 });
    },
  },
  {
    name: 'Report to the project',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 3 — Pick the project and report', subtitle: SUBTITLE });
      await demo.click({ selector: '[data-testid="report-to-project"] button[role="combobox"]', label: 'Project' });
      await demo.click({ selector: '[role="option"]:has-text("Composer Bugs")', label: 'Composer Bugs' });
      await demo.click({ selector: '[data-testid="report-to-project-button"]', label: 'Report to project' });
      // The form clears once the task is filed; exporting and storing the logs takes a while.
      await page.waitForFunction(
        () => (document.querySelector('input[placeholder="Short summary of the issue."]')?.value ?? 'x') === '',
        undefined,
        { timeout: 120_000 },
      );
      await page.waitForTimeout(2500);
    },
  },
  {
    name: 'Open the reported task',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Step 4 — The task carries the report, screenshot and logs', subtitle: SUBTITLE });
      await demo.click({ selector: 'button:has-text("Feedback & Support")', label: 'Close sidebar' });
      await demo.click({ selector: ':text-is("Composer Bugs")', label: 'Composer Bugs' });
      await demo.click({ selector: 'button:text-is("Tasks")', label: 'Tasks' });
      await demo.click({ selector: ':text-is("Kanban card drag snaps back")', label: 'Task' });
      await page.getByText('Attachments').first().waitFor({ state: 'visible', timeout: 15_000 });
      await demo.hover({ selector: ':text("composer-logs-") >> nth=0' });
      await page.waitForTimeout(3000);
    },
  },
];
