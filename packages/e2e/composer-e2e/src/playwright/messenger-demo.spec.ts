//
// Copyright 2026 DXOS.org
//

import { type Browser, type BrowserContext, expect, test } from '@playwright/test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { log } from '@dxos/log';

import { AppManager, isLocalOrigin } from './app-manager.ts';
import { Markdown } from './plugins/index.ts';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

/**
 * `DEMO=1` makes the run watchable: two side-by-side windows, a hold before the first step until
 * {@link DEMO_TRIGGER} exists (so a screen recorder can be started), and a pause after every step.
 */
const DEMO = process.env.DEMO === '1';
const DEMO_TRIGGER = path.resolve(import.meta.dirname, '../../../../../temp/demo-start');
const DEMO_PAUSE = Number(process.env.DEMO_PAUSE_MS) || 1_500;
// Half of a 1728pt-wide display each; override with DEMO_WINDOW_WIDTH / DEMO_WINDOW_HEIGHT.
const DEMO_WINDOW = {
  width: Number(process.env.DEMO_WINDOW_WIDTH) || 864,
  height: Number(process.env.DEMO_WINDOW_HEIGHT) || 1080,
};
// Composer's desktop layout (navtree sidebar open) starts at `lg` = 1024 CSS px; scaling each window
// down lets two side-by-side windows both lay out past it.
const DEMO_SCALE = Math.min(1, DEMO_WINDOW.width / 1080);

/** The rail companion that holds the notifications panel. */
const MESSENGER = 'messenger';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const step = async (label: string): Promise<void> => {
  if (DEMO) {
    // eslint-disable-next-line no-console
    console.log(`== ${label}`);
    await delay(DEMO_PAUSE);
  }
};

const waitForDemoTrigger = async (): Promise<void> => {
  mkdirSync(path.dirname(DEMO_TRIGGER), { recursive: true });
  rmSync(DEMO_TRIGGER, { force: true });
  // eslint-disable-next-line no-console
  console.log(`READY — waiting for ${path.relative(process.cwd(), DEMO_TRIGGER)} (${DEMO_TRIGGER})`);
  while (!existsSync(DEMO_TRIGGER)) {
    await delay(500);
  }
  rmSync(DEMO_TRIGGER, { force: true });
};

test.describe('Messenger demo', () => {
  let alice: AppManager;
  let bob: AppManager;
  const demoBrowsers: Browser[] = [];

  test.beforeEach(async ({ browser, playwright }) => {
    // The demo holds for its trigger with no upper bound a CI run would ever hit.
    test.setTimeout(DEMO ? 3_600_000 : 240_000);

    // Each peer gets its own context: a separate profile, so a separate identity.
    const peer = async (index: number): Promise<Browser | BrowserContext> => {
      if (!DEMO) {
        return browser;
      }
      // Separate windows placed side by side.
      const demoBrowser = await playwright.chromium.launch({
        headless: false,
        args: [
          `--window-position=${index * DEMO_WINDOW.width},0`,
          `--window-size=${DEMO_WINDOW.width},${DEMO_WINDOW.height}`,
          `--force-device-scale-factor=${DEMO_SCALE}`,
        ],
      });
      demoBrowsers.push(demoBrowser);
      // What the scaled window shows, in CSS px (the window less ~100pt of browser chrome); the runner's
      // project `deviceScaleFactor` rules out a window-sized (`null`) viewport.
      return demoBrowser.newContext({
        viewport: {
          width: Math.floor(DEMO_WINDOW.width / DEMO_SCALE),
          height: Math.floor((DEMO_WINDOW.height - 100) / DEMO_SCALE),
        },
      });
    };

    alice = new AppManager(await peer(0), false);
    bob = new AppManager(await peer(1), false);
    await Promise.all([alice.init(), bob.init()]);

    if (!isLocalOrigin()) {
      await Promise.all([alice.bindHubAccount('alice'), bob.bindHubAccount('bob')]);
    }
  });

  test.afterEach(async () => {
    if (alice !== undefined && bob !== undefined) {
      await Promise.all([alice.close(), bob.close()]);
    }
    await Promise.all(demoBrowsers.splice(0).map((demoBrowser) => demoBrowser.close()));
  });

  test('collaborate, then invite a contact from the notifications inbox', { tag: ['@QA-12'] }, async () => {
    const runId = process.env.DX_E2E_RUN_ID ?? Date.now().toString(36);
    const sharedName = `QA: Shared ${runId}`;
    const designName = `QA: Design ${runId}`;

    if (DEMO) {
      await waitForDemoTrigger();
    }

    await step('1. Alice names herself');
    await alice.setDisplayName('Alice');

    await step('2. Bob names himself');
    await bob.setDisplayName('Bob');

    await step(`3. Alice creates "${sharedName}"`);
    await alice.createSpace({ name: sharedName });
    const sharedSpace = alice.workspaceId;

    await step('4. Alice shares the space');
    await alice.shareSpace();
    const invitationCode = await alice.createSpaceInvitation();
    const authCode = await alice.getAuthCode();

    await step('5. Bob joins with the invitation and auth code');
    await bob.joinSpace();
    await bob.shell.acceptSpaceInvitation(invitationCode);
    await bob.shell.authenticate(authCode);
    await expect.poll(() => bob.workspaceId, { timeout: 30_000 }).toBe(sharedSpace);
    await bob.waitForSpaceReady(30_000);

    await step('6. Alice creates a document');
    await alice.createObject({ type: 'Document' });
    const aliceTextbox = Markdown.getMarkdownTextboxWithLocator(alice.deck.plank().locator);
    await aliceTextbox.waitFor();
    await aliceTextbox.focus();
    await alice.page.keyboard.insertText('Agenda');
    await bob.expandSection('spacePlugin.collectionsSection');
    await expect(bob.getObjectLinks()).toHaveCount(1, { timeout: 30_000 });
    await bob.navigateToObject(0);
    const bobTextbox = Markdown.getMarkdownTextboxWithLocator(bob.deck.plank().locator);
    await expect(bobTextbox).toContainText('Agenda', { timeout: 30_000 });

    await step('7. Both edit the document');
    await aliceTextbox.focus();
    await alice.page.keyboard.press('ControlOrMeta+End');
    await alice.page.keyboard.press('Enter');
    await alice.page.keyboard.insertText('- from Alice');
    // The list marker renders as a bullet decoration, so the assertions match the line's text after it.
    await expect(bobTextbox).toContainText('from Alice');
    await bobTextbox.focus();
    await bob.page.keyboard.press('ControlOrMeta+End');
    await bob.page.keyboard.press('Enter');
    await bob.page.keyboard.insertText('- from Bob');
    // Convergence: each peer holds both lines, so neither write overwrote the other.
    for (const textbox of [aliceTextbox, bobTextbox]) {
      await expect(textbox).toContainText('from Alice');
      await expect(textbox).toContainText('from Bob');
    }

    await step(`8. Bob creates "${designName}"`);
    await bob.createSpace({ name: designName });
    const designSpace = bob.workspaceId;
    const badgeBefore = await alice.getCompanionBadge(MESSENGER);

    await step('9. Bob invites Alice as a contact');
    await bob.shareSpace();
    await bob.addContactToSpace('Alice');

    await step('10. Alice is notified');
    await expect.poll(() => alice.getCompanionBadge(MESSENGER), { timeout: 60_000 }).toBeGreaterThan(badgeBefore);
    const badgeNotified = await alice.getCompanionBadge(MESSENGER);
    await alice.openCompanion(MESSENGER);
    const invitation = alice.page
      .getByTestId('messenger.notification')
      .filter({ hasText: `Invitation to ${designName}` });
    await expect(invitation).toBeVisible({ timeout: 15_000 });
    await expect(invitation.getByTestId('space-invitation-card.join')).toBeVisible();

    await step('11. Alice accepts');
    await invitation.getByTestId('space-invitation-card.join').click();
    await expect.poll(() => alice.workspaceId, { timeout: 60_000 }).toBe(designSpace);
    await expect(invitation.getByTestId('space-invitation-card.open')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => alice.getCompanionBadge(MESSENGER), { timeout: 15_000 }).toBe(badgeNotified - 1);

    await step('Done');
  });
});
