//
// Copyright 2026 DXOS.org
//

/**
 * Connect a Cloudflare OS account, bind a new workspace to the space, ask the Cloudflare OS agent to build a
 * gadget from Composer's chat, accept its change, and use the gadget in Composer. The gadget runs in the
 * same sandbox Cloudflare OS gives it; every click crosses to its server on the deployment.
 *
 * @title Cloudflare OS in Composer
 * @mdl packages/plugins/plugin-cloudflare-os/PLUGIN.mdl test QA-1
 * @app composer-app via `DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true DX_DEV=true moon run composer-app:serve -- --port 4173`
 *
 * The account comes from the driver's environment, so start the driver with it set:
 *
 *   set -a; . .secrets/cloudflareos.env; set +a
 *   node .agents/skills/autocue/scripts/driver.mjs --url http://localhost:4173 --out /tmp/cfos
 */

const USERNAME = process.env.CFOS_AGENT_USERNAME;
const PASSWORD = process.env.CFOS_AGENT_PASSWORD;

const SOURCE = 'from plugin-cloudflare-os/PLUGIN.mdl';

/** A beat for the viewer after a visible change. */
const BEAT = 1_500;

/** The longest a Workers AI model takes to build a small gadget. */
const TURN_TIMEOUT = 300_000;

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

const treeRow = (suffix) => `[data-tree-row][data-object-id$="${suffix}"]`;

const expand = async (page, suffix) => {
  const row = page.locator(treeRow(suffix)).first();
  if ((await row.getAttribute('data-state')) !== 'open') {
    await row.locator('[data-part="branch-trigger"]').first().click();
  }
};

const gadgetFrame = '[data-testid="cloudflare-os.gadget-frame"] >> internal:control=enter-frame';

export const steps = [
  {
    name: 'Prep (off camera): wait for the space and dismiss notices',
    setup: true,
    run: async ({ page }) => {
      if (!USERNAME || !PASSWORD) {
        throw new Error('Set CFOS_AGENT_USERNAME and CFOS_AGENT_PASSWORD in the driver environment.');
      }
      await page
        .locator('[data-testid="spacePlugin.settings"]')
        .first()
        .waitFor({ state: 'visible', timeout: 180_000 });
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      const closeCompanion = page.locator('[data-testid="plankHeading.closeCompanion"]');
      if (await visible(closeCompanion)) {
        await closeCompanion.first().click();
      }
    },
  },
  {
    name: "Open the space's connections",
    narration: 'Composer is the frontend. A Cloudflare OS deployment is the backend.',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Cloudflare OS in Composer',
        subtitle: 'Workspaces, gadgets and an agent',
        hold: 3_600,
      });
      await demo.caption({ value: "Open the space's connections", subtitle: SOURCE });
      await expand(page, '/settings');
      await demo.click({ selector: treeRow('/settings/connections'), label: 'Connections' });
      await page.getByText('Add connection').first().waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Pick Cloudflare OS',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Pick Cloudflare OS', subtitle: SOURCE });
      await demo.click({ selector: 'button:text-is("Connect")', label: 'Connect' });
      await demo.click({ selector: '[role=dialog] :text-is("Cloudflare OS")', label: 'Cloudflare OS' });
      await demo.click({ selector: '[role=dialog] button:has-text("Continue")', label: 'Continue' });
      await page.locator('[role=dialog] input[placeholder="Password"]').waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Sign in',
    narration: 'Signing in stores a session token, never the password.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Sign in to the deployment', subtitle: SOURCE });
      await demo.type({ selector: '[role=dialog] input[placeholder="Username"]', value: USERNAME, delay: 60 });
      await demo.fill({ selector: '[role=dialog] input[placeholder="Password"]', value: PASSWORD, hud: false });
      await demo.click({ selector: '[role=dialog] button:has-text("Save")', label: 'Save' });
      await page.getByText('New workspace').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Bind a new workspace',
    narration: 'Each space binds one Cloudflare OS workspace.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Bind a new workspace to the space', subtitle: SOURCE });
      await demo.click({ selector: '[role=dialog] :text-is("New workspace")', label: 'New workspace' });
      await demo.click({ selector: '[role=dialog] button:text-is("Save")', label: 'Save' });
      await page.locator(treeRow('/content/org.dxos.type.cloudflareOs.workspace')).first().waitFor({
        state: 'visible',
        timeout: 30_000,
      });
    },
  },
  {
    name: 'Open the workspace',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Open the workspace', subtitle: SOURCE });
      await expand(page, '/content/org.dxos.type.cloudflareOs.workspace');
      await demo.click({ selector: '[data-tree-row][data-object-id*="cloudflareOs.workspace/"]', label: 'Composer' });
      await page.getByText('This workspace has no gadgets yet').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Pick the Cloudflare OS agent',
    narration: "The workspace's agent joins Composer's agent picker.",
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Pick the Cloudflare OS agent', subtitle: SOURCE });
      await demo.click({ selector: '[data-testid="deck.companion.tab.assistant-chat"]', label: 'Assistant' });
      await demo.click({ selector: '[data-testid="assistant.agent-picker"]', label: 'Agent' });
      await page.waitForTimeout(BEAT);
      await demo.click({ selector: '[role=menu] :text-is("Cloudflare OS")', label: 'Cloudflare OS' });
      await page
        .locator('[data-testid="assistant.agent-picker"]:has-text("Cloudflare OS")')
        .waitFor({ timeout: 10_000 });
    },
  },
  {
    name: 'Ask for a gadget',
    narration: 'It builds a gadget on Cloudflare, and Composer shows its work as it goes.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Ask for a gadget', subtitle: SOURCE });
      await demo.type({
        selector: '[data-testid="assistant.prompt"] .cm-content',
        value: 'Build a tally counter gadget with - and + buttons.',
        delay: 40,
      });
      await demo.press({ key: 'Enter' });
      await demo.speed({ factor: 10 });
      await page
        .locator('button:has-text("Accept changes")')
        .first()
        .waitFor({ state: 'visible', timeout: TURN_TIMEOUT });
      await demo.speed({ factor: 1 });
      await page.waitForTimeout(BEAT);
    },
  },
  {
    name: 'Accept the change',
    narration: 'Nothing lands until you accept it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Accept the change', subtitle: SOURCE });
      await demo.click({ selector: 'button:has-text("Accept changes")', label: 'Accept changes' });
      await page.getByText('Answered: Accept changes').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page
        .locator('[data-testid^="cloudflare-os.gadget."]:not(:has-text("(proposed)"))')
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });
    },
  },
  {
    name: 'Run the gadget',
    narration: 'The gadget runs in Composer, in the same sandbox Cloudflare OS gives it.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Run the gadget', subtitle: SOURCE });
      await demo.click({
        selector: '[data-testid^="cloudflare-os.gadget."]:not(:has-text("(proposed)"))',
        label: 'Gadget',
      });
      const plus = page.locator(`${gadgetFrame} >> button:has-text("+")`).first();
      await plus.waitFor({ state: 'visible', timeout: 30_000 });
      for (let click = 0; click < 3; click++) {
        await demo.click({ selector: `${gadgetFrame} >> button:has-text("+") >> nth=0`, label: '+' });
      }
      await page.locator(`${gadgetFrame} >> text=3`).first().waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Hold on the result',
    narration: 'Your data stays in Composer, while the agent builds on Cloudflare, behind your approval.',
    run: async ({ demo, page }) => {
      await demo.clearCaption();
      await page.waitForTimeout(10_000);
    },
  },
];
