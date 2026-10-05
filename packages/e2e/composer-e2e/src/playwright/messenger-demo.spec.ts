//
// Copyright 2026 DXOS.org
//

import { type Browser, type BrowserContext, type Page, expect, test } from '@playwright/test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { log } from '@dxos/log';

import { AppManager, isLocalOrigin } from './app-manager.ts';
import { Markdown } from './plugins/index.ts';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

/** A millisecond setting from the environment; an explicit `0` is honoured. */
const envMs = (name: string, fallback: number): number => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : Number(value);
};

/**
 * `DEMO=1` makes the run watchable: two side-by-side windows, a hold before the first step until
 * {@link DEMO_TRIGGER} exists (so a screen recorder can be started), a pause after every step, a
 * longer one after each major action so its result settles on screen, visible typing, and a hold
 * before the windows close.
 */
const DEMO = process.env.DEMO === '1';
const DEMO_TRIGGER = path.resolve(import.meta.dirname, '../../../../../temp/demo-start');
const DEMO_PAUSE = envMs('DEMO_PAUSE_MS', 1_500);
const DEMO_MAJOR_PAUSE = envMs('DEMO_MAJOR_PAUSE_MS', 3_000);
const DEMO_END_HOLD = envMs('DEMO_END_HOLD_MS', 5_000);
const DEMO_TYPING_DELAY = envMs('DEMO_TYPING_DELAY_MS', 40);
// Composer's desktop layout (navtree sidebar open) starts at `lg` = 1024 CSS px, so each window is that
// wide; on a display narrower than two of them they overlap, Bob behind on the left and Alice in front
// on the right so her notifications panel is never covered. Fractional `--force-device-scale-factor`
// is avoided: macOS draws such windows blank.
const DEMO_SCREEN_WIDTH = Number(process.env.DEMO_SCREEN_WIDTH) || 1728;
const DEMO_WINDOW = {
  width: Number(process.env.DEMO_WINDOW_WIDTH) || 1024,
  height: Number(process.env.DEMO_WINDOW_HEIGHT) || 1080,
};

/** The rail companion that holds the notifications panel. */
const MESSENGER = 'messenger';

// The shared document: Alice writes the title and a paragraph with a typo, Bob adds his own paragraph
// and fixes hers.
const DOCUMENT_TITLE = 'Q3 Planning';
const MISSPELLING = 'assing';
const CORRECTION = 'assign';
const ALICE_PARAGRAPH = `We will finalise the roadmap and ${MISSPELLING} owners this week.`;
const BOB_PARAGRAPH = 'I will draft the launch checklist and share it on Friday.';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const step = async (label: string): Promise<void> => {
  if (DEMO) {
    // eslint-disable-next-line no-console
    console.log(`== ${label}`);
    await delay(DEMO_PAUSE);
  }
};

/** Holds after a major action (DEMO only) so the viewer sees its result arrive on both peers. */
const majorPause = async (): Promise<void> => {
  if (DEMO) {
    await delay(DEMO_MAJOR_PAUSE);
  }
};

/** Types at the cursor, a character at a time in DEMO so the viewer can follow it. */
const typeText = async (page: Page, text: string): Promise<void> => {
  if (DEMO) {
    await page.keyboard.type(text, { delay: DEMO_TYPING_DELAY });
  } else {
    await page.keyboard.insertText(text);
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
    const peer = async (left: number): Promise<Browser | BrowserContext> => {
      if (!DEMO) {
        return browser;
      }
      const demoBrowser = await playwright.chromium.launch({
        headless: false,
        args: [`--window-position=${left},0`, `--window-size=${DEMO_WINDOW.width},${DEMO_WINDOW.height}`],
      });
      demoBrowsers.push(demoBrowser);
      // The window less ~100pt of browser chrome; the runner's project `deviceScaleFactor` rules out a
      // window-sized (`null`) viewport.
      return demoBrowser.newContext({
        viewport: { width: DEMO_WINDOW.width, height: DEMO_WINDOW.height - 100 },
      });
    };

    // Bob opens first so Alice's window lands in front of it.
    bob = new AppManager(await peer(0), false);
    alice = new AppManager(await peer(Math.max(0, DEMO_SCREEN_WIDTH - DEMO_WINDOW.width)), false);
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

    // Setup, not part of the demo: the first-run notice and the companion panel would cover the content.
    await Promise.all(
      [alice, bob].map(async (peer) => {
        await peer.dismissPrivacyNotice();
        await peer.closeComplementarySidebar();
      }),
    );

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
    await majorPause();

    await step('4. Alice shares the space');
    await alice.shareSpace();
    const invitationCode = await alice.createSpaceInvitation();
    const authCode = await alice.getAuthCode();
    await majorPause();

    await step('5. Bob joins with the invitation and auth code');
    await bob.joinSpace();
    await bob.shell.acceptSpaceInvitation(invitationCode);
    await bob.shell.authenticate(authCode);
    await expect.poll(() => bob.workspaceId, { timeout: 30_000 }).toBe(sharedSpace);
    await bob.waitForSpaceReady(30_000);
    await majorPause();

    await step('6. Alice creates a document; Bob opens it');
    await alice.createObject({ type: 'Document' });
    const aliceTextbox = Markdown.getMarkdownTextboxWithLocator(alice.deck.plank().locator);
    await aliceTextbox.waitFor();
    await bob.expandSection('spacePlugin.collectionsSection');
    await expect(bob.getObjectLinks()).toHaveCount(1, { timeout: 30_000 });
    await bob.navigateToObject(0);
    const bobTextbox = Markdown.getMarkdownTextboxWithLocator(bob.deck.plank().locator);
    await bobTextbox.waitFor();

    await step('7. Alice writes a title and a paragraph');
    await aliceTextbox.focus();
    await alice.page.keyboard.press('ControlOrMeta+End');
    await typeText(alice.page, `# ${DOCUMENT_TITLE}`);
    await alice.page.keyboard.press('Enter');
    await alice.page.keyboard.press('Enter');
    await typeText(alice.page, ALICE_PARAGRAPH);
    await expect(bobTextbox).toContainText(DOCUMENT_TITLE, { timeout: 30_000 });
    await expect(bobTextbox).toContainText(ALICE_PARAGRAPH, { timeout: 30_000 });
    await majorPause();

    await step('8. Bob adds a paragraph');
    await bobTextbox.focus();
    await bob.page.keyboard.press('ControlOrMeta+End');
    await bob.page.keyboard.press('Enter');
    await bob.page.keyboard.press('Enter');
    await typeText(bob.page, BOB_PARAGRAPH);
    await expect(aliceTextbox).toContainText(BOB_PARAGRAPH, { timeout: 30_000 });
    await majorPause();

    await step(`9. Bob corrects "${MISSPELLING}" in Alice's paragraph`);
    await bobTextbox.focus();
    await Markdown.select(bobTextbox, MISSPELLING);
    await delay(DEMO ? DEMO_PAUSE : 0);
    await typeText(bob.page, CORRECTION);
    // Peers render Bob's caret with his name inline, so it is parked at the end, away from the asserted text.
    await bob.page.keyboard.press('ControlOrMeta+End');
    // Convergence: each peer holds the title, Alice's corrected paragraph and Bob's paragraph.
    for (const textbox of [aliceTextbox, bobTextbox]) {
      await expect(textbox).toContainText(DOCUMENT_TITLE);
      await expect(textbox).toContainText(ALICE_PARAGRAPH.replace(MISSPELLING, CORRECTION), { timeout: 30_000 });
      await expect(textbox).toContainText(BOB_PARAGRAPH);
      await expect(textbox).not.toContainText(MISSPELLING);
    }
    await majorPause();

    await step(`10. Bob creates "${designName}"`);
    await bob.createSpace({ name: designName });
    const designSpace = bob.workspaceId;
    const badgeBefore = await alice.getCompanionBadge(MESSENGER);
    await majorPause();

    await step('11. Bob invites Alice as a contact');
    await bob.shareSpace();
    await bob.addContactToSpace('Alice');
    await majorPause();

    await step('12. Alice is notified');
    await expect.poll(() => alice.getCompanionBadge(MESSENGER), { timeout: 60_000 }).toBeGreaterThan(badgeBefore);
    const badgeNotified = await alice.getCompanionBadge(MESSENGER);
    await alice.openCompanion(MESSENGER);
    const invitation = alice.page
      .getByTestId('messenger.notification')
      .filter({ hasText: `Invitation to ${designName}` });
    await expect(invitation).toBeVisible({ timeout: 15_000 });
    await expect(invitation.getByTestId('space-invitation-card.join')).toBeVisible();

    await step('13. Alice accepts');
    await invitation.getByTestId('space-invitation-card.join').click();
    await expect.poll(() => alice.workspaceId, { timeout: 60_000 }).toBe(designSpace);
    await expect(invitation.getByTestId('space-invitation-card.open')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => alice.getCompanionBadge(MESSENGER), { timeout: 15_000 }).toBe(badgeNotified - 1);
    await majorPause();

    await step('14. Alice sees Bob in her contacts');
    await alice.openUserContacts();
    await expect(alice.getContact('Bob')).toBeVisible({ timeout: 15_000 });
    await majorPause();

    await step('Done');
    if (DEMO) {
      await delay(DEMO_END_HOLD);
    }
  });
});
