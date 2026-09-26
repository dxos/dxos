//
// Copyright 2023 DXOS.org
//

import {
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  type Frame,
  type Locator,
  type Page,
  expect,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';
import os from 'node:os';

import { Trigger } from '@dxos/async';
import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test-utils/playwright';

import { DeckManager } from './plugins/index.ts';

// TODO(wittjosiah): Normalize data-testids between snake and camel case.
// TODO(wittjosiah): Consider structuring tests in such that they could be run with different sets of plugins enabled.

// TODO(wittjosiah): Beware that sometimes the playwright chromium seems to appear as Windows.
//   At least via `navigator.userAgent.platform`.
const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';

// 127.0.0.1, not localhost: localhost resolves to ::1 first, and Firefox fails ICE outright on a page
// served over IPv6 loopback, which strands every invitation.
export const INITIAL_URL = 'http://127.0.0.1:4173';

// `REGISTRY_ID`, restated so this page-object does not import the registry plugin: its module graph
// reaches packages that fail to load under playwright's loader.
const REGISTRY_WORKSPACE = 'dxos:registry';

// `UrlPath.WORKSPACE_KEY` — the pair-chain anchor segment, restated for the same reason.
const WORKSPACE_KEY = 'w';

// localStorage prefix of the navtree's `navtree-open` view-state aspect, restated for the same reason;
// the key's suffix is the tree path joined with `+`.
const NAVTREE_OPEN_STORAGE_PREFIX = 'dxos:view-state:navtree-open:';

/** Builds the pair-chain base for a workspace: `/<anchor>/<workspace>`. */
const workspaceUrl = (workspace: string) => `${INITIAL_URL.replace(/\/$/, '')}/${WORKSPACE_KEY}/${workspace}`;

// Only the default space is seeded on every new identity. The exemplar space is skipped on
// localhost (see OnboardingPlugin `generateDemoSpace`), which is where e2e tests run.
export const INITIAL_SPACE_COUNT = 1;

/**
 * Budget for `joinNewIdentity()`: spans deleting the identity and every space it held, so it is sized
 * above the 30s `actionTimeout` a single interaction gets.
 */
const JOIN_IDENTITY_TIMEOUT = 60_000;

/** The default space's Home, which a first-run boot lands on. */
const DEFAULT_WORKSPACE_URL = /\/w\/[A-Z0-9]{20,}\/home/;

/** A joined device stops at the inviter's workspace root rather than reaching its `/home` plank. */
const JOINED_WORKSPACE_URL = /\/w\/[A-Z0-9]{20,}/;

/** How long the URL must hold still before boot counts as finished. */
const BOOT_QUIET_PERIOD = 1_000;

/**
 * Typenames behind the friendly names specs pass to `createObject()`, keyed by typename since the
 * type-picker's testid uses it (its label is localized). A missing name fails on the locator instead
 * of silently.
 */
const OBJECT_TYPENAMES: Record<string, string> = {
  Chat: 'org.dxos.type.assistant.chat',
  Collection: 'org.dxos.type.collection',
  Document: 'org.dxos.type.document',
  Mailbox: 'org.dxos.type.mailbox',
  Project: 'org.dxos.type.project',
  Table: 'org.dxos.type.table',
};

export class AppManager {
  page!: Page;
  shell!: ShellManager;
  deck!: DeckManager;

  private readonly _inIframe: boolean | undefined = undefined;
  private _initialized = false;
  private _close?: () => Promise<void>;
  private _invitationCode = new Trigger<string>();
  private _authCode = new Trigger<string>();
  // Rolling tail of console errors: the app reports operation failures generically to the user, and
  // the real cause only reaches `log.catch`.
  private _consoleErrors: string[] = [];

  // prettier-ignore
  constructor(
    // A context, not only a browser: an extension test must run in the persistent context the
    // extension is loaded into, and `setupPage` already accepts either.
    private readonly _browser: Browser | BrowserContext,
    inIframe?: boolean,
  ) {
    this._inIframe = inIframe;
  }

  async init(): Promise<void> {
    if (this._initialized) {
      return;
    }

    const { page, close } = await setupPage(this._browser, { url: INITIAL_URL });
    this.page = page;
    this._close = close;
    this.page.on('console', (message) => this._onConsoleMessage(message));

    // Assert boot rather than proceed on a swallowed `false`, so a failed boot fails here instead of as
    // a bare `Test timeout` inside the first action. 30s is ~2x the slowest healthy boot (CI firefox
    // measures ~16s); past that it is not booting, and waiting only eats the test's budget.
    const authenticated = await this.isAuthenticated({ timeout: 30_000 });
    expect(authenticated, 'app did not boot: treeView.userAccount never appeared').toBe(true);

    // Boot ends with onboarding opening the default space's Home and persisting the navtree's open
    // state; acting before that last write lands races it. Home's own key is NOT that write any
    // more: exposing an item opens the path down to it and leaves the item itself as it was
    // (#13414), and Home's ancestors are already open, so nothing is persisted for them either.
    await this.waitForDefaultWorkspace();
    const home = `root/${this.workspaceId}/home`;
    await expect(this.page.getByTestId('deck.plank').first()).toHaveAttribute('data-attendable-id', home, {
      timeout: 30_000,
    });
    // The workspace's sections are what boot persists, so one of those is the write to wait on —
    // `content`, since that is the section the specs then act in.
    const contentOpenKey = `${NAVTREE_OPEN_STORAGE_PREFIX}root+root/${this.workspaceId}+root/${this.workspaceId}/content`;
    await expect
      .poll(() => this.page.evaluate((key) => window.localStorage.getItem(key), contentOpenKey), { timeout: 30_000 })
      .toBe('{"open":true}');

    this.shell = new ShellManager(this.page, this._inIframe);
    this._initialized = true;
    this.deck = new DeckManager(this.page);
  }

  async close(): Promise<void> {
    await this._close?.();
  }

  //
  // Page
  //

  // Based on https://github.com/microsoft/playwright/issues/8114#issuecomment-1584033229.
  async copy(): Promise<void> {
    await this.page.keyboard.press(`${modifier}+KeyC`);
  }

  async cut(): Promise<void> {
    await this.page.keyboard.press(`${modifier}+KeyX`);
  }

  async paste(): Promise<void> {
    await this.page.keyboard.press(`${modifier}+KeyV`);
  }

  isAuthenticated({ timeout = 5_000 } = {}): Promise<boolean> {
    return this.page
      .getByTestId('treeView.userAccount')
      .waitFor({ timeout })
      .then(() => true)
      .catch(() => false);
  }

  get currentWorkspace(): Locator {
    return this.page.getByTestId('navtree.workspace.visible');
  }

  get workspaceId(): string | undefined {
    const [anchor, workspace] = new URL(this.page.url()).pathname.split('/').filter(Boolean);
    return anchor === WORKSPACE_KEY ? workspace : undefined;
  }

  /** Waits until boot has navigated to the default space's Home and stopped navigating. */
  async waitForDefaultWorkspace(): Promise<void> {
    await this.#waitForBoot(DEFAULT_WORKSPACE_URL);
  }

  /** The same, for a device that has just joined an existing identity. */
  async waitForJoinedWorkspace(): Promise<void> {
    await this.#waitForBoot(JOINED_WORKSPACE_URL);
  }

  /**
   * Arrive at `url`, then wait for boot to stop navigating away from it. Boot navigates more than
   * once, so the test waits for the URL to stop moving rather than for its first arrival.
   */
  async #waitForBoot(url: RegExp): Promise<void> {
    let lastNavigation = Date.now();
    const onNavigated = (frame: Frame) => {
      if (frame === this.page.mainFrame()) {
        lastNavigation = Date.now();
      }
    };

    this.page.on('framenavigated', onNavigated);
    try {
      await this.page.waitForURL(url, { timeout: 60_000 });
      await expect
        .poll(() => Date.now() - lastNavigation, { timeout: 30_000, intervals: [50] })
        .toBeGreaterThanOrEqual(BOOT_QUIET_PERIOD);
    } finally {
      this.page.off('framenavigated', onNavigated);
    }

    await expect(this.page).toHaveURL(url);
  }

  /**
   * Waits for a new identity, created in place, to land on its own default space's Home — a different
   * workspace from `previousWorkspace`, the one the deleted identity was on.
   */
  async waitForNewIdentityWorkspace(previousWorkspace: string | undefined): Promise<void> {
    await expect.poll(() => this.workspaceId, { timeout: 60_000 }).not.toBe(previousWorkspace);
    await this.waitForDefaultWorkspace();
  }

  /**
   * Tags the live document so {@link expectSameDocument} can prove a flow ran in place: a reload, or
   * a navigation to a new document, starts a fresh global scope without the tag.
   */
  async markDocument(): Promise<string> {
    const tag = randomUUID();
    await this.page.evaluate((tag) => {
      globalThis.e2eDocumentTag = tag;
    }, tag);
    return tag;
  }

  /** Fails unless the page still holds the document {@link markDocument} tagged. */
  async expectSameDocument(tag: string): Promise<void> {
    expect(await this.page.evaluate(() => globalThis.e2eDocumentTag), 'the page reloaded').toBe(tag);
  }

  async openUserAccount(timeout = 30_000): Promise<void> {
    await this.page.getByTestId('clientPlugin.account').click();
    await this.page.getByTestId('clientPlugin.devices').waitFor({ state: 'visible', timeout });
  }

  async openUserDevices(timeout = 30_000): Promise<void> {
    await this.openUserAccount(timeout);
    await this.showUserDevices(timeout);
  }

  /** Switches to the devices panel from another account panel; the account rail tab toggles the sidebar. */
  async showUserDevices(timeout = 30_000): Promise<void> {
    await this.page.getByTestId('clientPlugin.devices').click();
    await this.page.getByTestId('devicesContainer.logout').waitFor({ state: 'visible', timeout });
  }

  async openUserSecurity(timeout = 30_000): Promise<void> {
    await this.openUserAccount(timeout);
    await this.page.getByTestId('clientPlugin.security').click();
    await this.page.getByTestId('recoveryCredentials.createRecoveryCode').waitFor({ state: 'visible', timeout });
  }

  /** Writes a recovery credential and returns its code, acknowledging the dialog that shows it. */
  async createRecoveryCode(): Promise<string> {
    await this.page.getByTestId('recoveryCredentials.createRecoveryCode').click();
    const code = await this.page.getByTestId('recoveryCode.code').getAttribute('data-code', { timeout: 30_000 });
    expect(code, 'the recovery code dialog showed no code').toBeTruthy();
    await this.confirmRecoveryCode();
    return code ?? '';
  }

  /** From the devices panel: deletes this identity and re-admits the device with a recovery code. */
  async recoverIdentity(recoveryCode: string, confirmInput = 'RESET'): Promise<void> {
    await this.page.getByTestId('devicesContainer.recover').click();
    const confirmInputLocator = this.page.getByTestId('recover.reset-identity-input');
    await confirmInputLocator.click();
    await confirmInputLocator.pressSequentially(confirmInput);
    const confirmButton = this.page.getByTestId('recover.reset-identity-confirm');
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // The join panel renders every step and shows one, so the recovery step's input is the visible one.
    const input = this.page.getByTestId('identity-input').filter({ visible: true });
    await expect(input).toBeVisible({ timeout: JOIN_IDENTITY_TIMEOUT });
    await input.fill(recoveryCode);
    await this.page.getByTestId('recover-identity-input-continue').click();
  }

  async createDeviceInvitation(): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();
    await this.page.getByTestId('devicesContainer.createInvitation').click();
    return await this._invitationCode.wait();
  }

  async getAuthCode(): Promise<string> {
    return await this._authCode.wait();
  }

  async logout(confirmInput = 'RESET'): Promise<void> {
    await this.page.getByTestId('devicesContainer.logout').click();
    await this.page.getByTestId('reset-storage.reset-identity-input').fill(confirmInput);
    await this.page.getByTestId('reset-storage.reset-identity-confirm').click();
  }

  async joinNewIdentity(confirmInput = 'RESET'): Promise<void> {
    await this.page.getByTestId('devicesContainer.joinExisting').click();
    // The confirm button's `disabled` gate reads `inputValue === confirmationValue`, but `fill()` sets
    // the value in one event, so the enabled state can still be settling when Playwright's
    // actionability check passes; asserting enabled first avoids racing that gate.
    const confirmInputLocator = this.page.getByTestId('join-new-identity.reset-identity-input');
    await confirmInputLocator.click();
    await confirmInputLocator.pressSequentially(confirmInput);
    const confirmButton = this.page.getByTestId('join-new-identity.reset-identity-confirm');
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // The identity is deleted in place and the join dialog replaces the confirmation.
    await expect(this.shell.shell.getByTestId('halo-invitation-input')).toBeVisible({
      timeout: JOIN_IDENTITY_TIMEOUT,
    });
  }

  async shareSpace(timeout = 15_000): Promise<void> {
    await this.#openSpaceSettingsPage('spacePlugin.members', timeout);
  }

  async #openSpaceSettingsPage(testId: string, timeout: number): Promise<void> {
    await this.expandSection('spacePlugin.settings', timeout);
    const heading = this.currentWorkspace.getByTestId(testId).first().getByTestId('treeItem.heading').first();
    await expect(heading).toBeVisible({ timeout });
    await heading.click({ timeout });
  }

  async createSpaceInvitation(): Promise<string> {
    this._invitationCode = new Trigger<string>();
    this._authCode = new Trigger<string>();
    await this.page.getByTestId('membersContainer.createInvitation.more').click();
    await this.page.getByTestId('membersContainer.inviteOne').click();
    await this.page.getByTestId('membersContainer.createInvitation').click();
    return await this._invitationCode.wait();
  }

  async confirmRecoveryCode(): Promise<void> {
    await this.page.getByTestId('recoveryCode.confirm').click();
    await this.page.getByTestId('recoveryCode.continue').click();
  }

  //
  // Toasts
  //

  async toastAction(nth = 0): Promise<void> {
    const toast = this.page
      .locator('[data-scope="toast"][data-part="root"]')
      .filter({ has: this.page.getByTestId('toast.action') })
      .nth(nth);
    // Addressed by its own id afterwards, since `nth` moves to the next toast once this one closes.
    const toastId = await toast.getAttribute('data-testid');
    if (!toastId) {
      throw new Error('toast root has no data-testid');
    }
    const action = toast.getByTestId('toast.action');
    // Hovering pauses the auto-dismiss timer; the click waits for the slide-in to stop moving the button.
    await action.hover();
    await action.click();
    await expect(this.page.getByTestId(toastId)).toBeHidden();
  }

  async closeToast(nth = 0): Promise<void> {
    await this.page.getByTestId('toast.close').nth(nth).click();
  }

  //
  // Spaces
  //

  async createSpace({ timeout = 10_000 }: { timeout?: number } = {}): Promise<void> {
    // The baseline counts rendered rail rows, so it is taken once one exists.
    await this.getSpaceItems().first().waitFor({ state: 'attached', timeout });
    const initialCount = await this.getSpaceItems().count();

    await this.#submitCreateSpaceForm();

    // The new rail item is the first condition pre-existing state cannot satisfy: a closed dialog
    // does not prove a space was created, and `waitForSpaceReady()` is already satisfied by the
    // space the app is in on entry.
    await expect(this.getSpaceItems()).toHaveCount(initialCount + 1, { timeout });

    await this.waitForSpaceReady(timeout);
  }

  /** Opens the add-space dialog, submits it, and waits for it to close. */
  async #submitCreateSpaceForm(): Promise<void> {
    const dialog = this.page.getByTestId('create-space-dialog');
    // Opened once, because `init()` waits out the boot writes that could detach the menu mid-click.
    await this.page.getByTestId('spacePlugin.addSpace').click();
    await this.page.getByTestId('spacePlugin.createSpace').click();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const form = this.page.getByTestId('create-space-form');
    // The action row is pinned outside the scrolling field region, so it is scoped to the dialog,
    // not to `create-space-form` (which marks the fields alone).
    const save = this.page.getByTestId('create-space-dialog').getByTestId('save-button');
    // Gate on ENABLED, not merely visible: fields arrive through a Surface lookup and can remount the
    // control mid-click, so waiting for `disabled` to clear absorbs that remount.
    await expect(save).toBeEnabled({ timeout: 15_000 });
    await save.click();

    // Closing the dialog waits on the space actually being created, so this is sized to the
    // operation rather than to an interaction. It is not the test's assertion — the caller's count
    // check is — so a generous bound only delays a genuine "dialog never closed" failure.
    try {
      await form.waitFor({ state: 'detached', timeout: 30_000 });
    } catch (err) {
      // The dialog stays open showing `create-space-dialog.error.message` on a failed create, which a
      // bare detach timeout cannot distinguish from a slow one; report the error text when present.
      const error = await form
        .getByTestId('form.error')
        .first()
        .textContent()
        .catch(() => null);
      // The dialog's message is generic by design, so the console tail (where `log.catch` puts the
      // squashed cause) is what attributes it.
      throw new Error(
        error
          ? `create-space failed: ${error.trim()} — console: ${this.recentConsoleErrors()}`
          : // No error rendered and the submit was clicked while enabled, so the operation is still pending.
            'create-space never completed: dialog still open with no error — SpaceOperation.Create did not resolve',
        { cause: err },
      );
    }
  }

  async joinSpace(): Promise<void> {
    await this.page.getByTestId('spacePlugin.addSpace').click();
    await this.page.getByTestId('spacePlugin.joinSpace').click();
  }

  async waitForSpaceReady(timeout = 10_000): Promise<void> {
    await this.page.waitForSelector('[data-testid="create-space-form"]', { state: 'detached', timeout });
    await this.page.waitForFunction(
      // Pair-chain URLs are `/<anchor>/<workspace>/…`, so the workspace follows the anchor segment.
      (anchorKey) => {
        const [anchor, workspaceId] = window.location.pathname.split('/').filter(Boolean);
        if (anchor !== anchorKey || !workspaceId) {
          return false;
        }

        const selectedSpace = document.querySelector('[data-testid="spacePlugin.space"][aria-selected="true"]');
        return selectedSpace?.getAttribute('data-object-id') === `root/${workspaceId}`;
      },
      WORKSPACE_KEY,
      { timeout },
    );
    // TODO(wittjosiah): This improves reliability significantly. Find a better thing to wait for.
    await this.page.waitForTimeout(500);
  }

  getSpacePresenceMembers(): Locator {
    return this.page.getByTestId('spacePlugin.presence.member');
  }

  /**
   * Opens the General settings panel (SpaceSettingsContainer) for the currently active space,
   * expanding the Settings section first if necessary.
   */
  async openSpaceSettings(timeout = 15_000): Promise<void> {
    await this.#openSpaceSettingsPage('spacePlugin.general', timeout);
  }

  /**
   * Deletes the space at the given index (default: the first non-default space) via its
   * settings danger zone, including the confirmation step.
   */
  async deleteSpace(nth = 1, timeout = 30_000): Promise<void> {
    const space = this.getSpaceItems().nth(nth);
    // Clicked once. A row left unselected after a reload is an app defect, and the assertion below reports it.
    await space.click();
    await expect(space).toHaveAttribute('aria-selected', 'true', { timeout });
    await this.openSpaceSettings(timeout);
    await this.page.getByTestId('spaceSettings.deleteSpace').click({ timeout });
    await this.page.getByTestId('spaceSettings.deleteSpaceConfirm').click();
  }

  async toggleSpaceCollapsed(nth = 0, nextState?: boolean): Promise<void> {
    const toggle = this.page.getByTestId('spacePlugin.space').nth(nth);

    if (typeof nextState !== 'undefined') {
      const state = await toggle.getAttribute('aria-selected');
      if (state !== nextState.toString()) {
        await toggle.click();
      }
    } else {
      await toggle.click();
    }
  }

  /** Discloses a row's children, leaving an already-open row alone. */
  async #expandRow(row: Locator, timeout: number): Promise<void> {
    const toggle = row.getByTestId('treeItem.toggle').first();
    // Read the state only once the toggle exists: `getAttribute` on a detached element answers
    // `null`, which is indistinguishable from "collapsed" and would click an open row shut.
    await expect(toggle).toBeAttached({ timeout });
    if ((await toggle.getAttribute('aria-expanded')) === 'true') {
      return;
    }
    // Hovering the row is what expands it in the graph, and a row with no children yet has a
    // disabled chevron — which Playwright would wait on forever, since it only moves the mouse
    // once the target is actionable.
    await row.hover();
    await expect(toggle).toBeEnabled({ timeout });
    await toggle.click();
    // An open commits through the model at once, so an expand that did not take fails here.
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout });
  }

  async expandCollection(nth = 0, timeout = 15_000): Promise<void> {
    await this.#expandRow(this.getObjectLinks().nth(nth), timeout);
  }

  async expandSection(testId: string, timeout = 15_000): Promise<void> {
    const section = this.currentWorkspace.getByTestId(testId).first();
    await section.waitFor({ state: 'attached', timeout });
    await this.#expandRow(section, timeout);
  }

  async createObject({ type, name, nth }: { type: string; name?: string; nth?: number }): Promise<void> {
    if (nth !== undefined) {
      const object = this.getObjectLinks().nth(nth);
      await object.hover();
      await object
        .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
        .first()
        .click();
      // Menu items are clicked, never focused-and-Entered: the menu machine activates whichever
      // item it has highlighted, and a programmatic `focus()` does not make one highlighted.
      await this.page.getByTestId('spacePlugin.createObject').last().click();
    } else {
      await this.currentWorkspace.getByTestId('spacePlugin.createObject').first().click();
    }

    const option = this.page.getByTestId(`create-object-form.type.${OBJECT_TYPENAMES[type]}`);
    await option.click({ timeout: 15_000 });

    // A type either shows its form or creates at once and closes the dialog; wait for whichever happens.
    const objectForm = this.page.getByTestId('create-object-form');
    const openDialog = this.page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
    await expect
      .poll(async () => (await objectForm.isVisible()) || !(await openDialog.isVisible()), { timeout: 30_000 })
      .toBe(true);
    if (!(await objectForm.isVisible())) {
      return;
    }

    if (name) {
      await objectForm.getByLabel('Name').fill(name);
    }
    await objectForm.getByTestId('save-button').click();
    // Reopening the dialog before it has finished closing reuses the instance, which is still on
    // the form rather than back at the type list, so the next caller must start from a clean one.
    await objectForm.waitFor({ state: 'detached', timeout: 30_000 });
  }

  async navigateToObject(nth = 0, delay = 100): Promise<void> {
    await this.getObjectLinks().nth(nth).click({ delay });
  }

  async renameObject(newName: string, nth = 0): Promise<void> {
    await this.getObjectLinks().nth(nth).hover();
    // Match any tree depth: the navtree's section-group nesting varies an object's level, and the
    // actions button testid encodes that level (`actionsLevel${level}`).
    await this.getObjectLinks()
      .nth(nth)
      .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
      .first()
      .click();
    await this.page.getByTestId('spacePlugin.renameObject').last().click();
    await this.page.getByTestId('spacePlugin.rename.input').fill(newName);
    await this.page.getByTestId('spacePlugin.rename.input').press('Enter');
    await this.page.mouse.move(0, 0, { steps: 4 });
  }

  async deleteObject(nth = 0): Promise<void> {
    await this.getObjectLinks()
      .nth(nth)
      .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
      .first()
      .click();
    await this.page.getByTestId('spacePlugin.deleteObject').last().click();
  }

  getObject(nth = 0): Locator {
    return this.getObjectLinks().nth(nth);
  }

  getObjectByName(name: string): Locator {
    return this.getObjectLinks().filter({ has: this.page.locator(`span:has-text("${name}")`) });
  }

  getSpaceItems(): Locator {
    return this.page.getByTestId('spacePlugin.space');
  }

  getObjectLinks(): Locator {
    return this.currentWorkspace.getByTestId('spacePlugin.object');
  }

  /**
   * Drags `active` onto `over` and releases only once `over` reports `instruction` as its drop zone.
   * The dragged row leaves the list when the drag starts, so rows below it move up: the target is
   * measured after that, not before.
   */
  async dragTo(
    active: Locator,
    over: Locator,
    {
      instruction,
      offset = { x: 0, y: 0 },
      holdUntil,
    }: {
      instruction: string;
      offset?: { x: number; y: number };
      /** Keeps the pointer in the zone until this holds, then drops. */
      holdUntil?: () => Promise<boolean>;
    },
  ): Promise<void> {
    const start = await active.boundingBox();
    const initial = await over.boundingBox();
    if (!start || !initial) {
      throw new Error('drag source or target has no layout box');
    }
    const startX = start.x + start.width / 2;
    const startY = start.y + start.height / 2;
    await active.hover();
    await this.page.mouse.down();
    // Past the drag threshold, still inside the source row, and toward the target: a nudge away from
    // it leaves the pointer over the row that slides into the dragged row's place.
    await this.page.mouse.move(startX, startY + (initial.y < start.y ? -6 : 6), { steps: 2 });
    await expect(active).toBeHidden();

    const box = await over.boundingBox();
    if (!box) {
      throw new Error('drop target has no layout box');
    }
    const x = offset.x + box.x + box.width / 2;
    const y = offset.y + box.y + box.height / 2;
    await this.page.mouse.move(x, y, { steps: 4 });
    // Chromium drops a dragover sent while the previous one is still unacknowledged, so the last position can
    // go unseen: keep moving within the zone until the target reports the expected drop.
    let nudge = 0;
    await expect
      .poll(async () => {
        nudge = 1 - nudge;
        await this.page.mouse.move(x, y + nudge);
        const zone = await over.getAttribute('data-instruction');
        if (zone !== instruction) {
          return zone;
        }
        return !holdUntil || (await holdUntil()) ? zone : `${zone} (holding)`;
      })
      .toBe(instruction);
    await this.page.mouse.up();
  }

  /** Drops `active` inside `collection`, holding over it until the tree opens it. */
  async dragInto(active: Locator, collection: Locator): Promise<void> {
    await this.dragTo(active, collection, {
      instruction: 'make-child',
      holdUntil: async () => (await collection.getAttribute('data-state')) === 'open',
    });
  }

  //
  // Plugins
  //

  async openSettings(): Promise<void> {
    await this.page.getByTestId('treeView.appSettings').click();
  }

  /** Opens one plugin's settings panel from the settings workspace tree. */
  async openPluginSettings(plugin: string): Promise<void> {
    await this.openSettings();
    const item = this.page.getByTestId(`settings.${plugin}`);
    await expect(item).toBeVisible();
    await item.click();
    await expect(item).toHaveAttribute('aria-selected', 'true');
  }

  /** The registry's dev-plugin URL field — an ordinary synced plugin setting. */
  getDevPluginUrlInput(): Locator {
    return this.page.getByTestId('registrySettings.devPluginUrl');
  }

  /**
   * The "use a different plugin set on this device" switch in the registry's settings panel. Absent
   * until the settings space opens.
   */
  getPluginScopeToggle(): Locator {
    return this.page.getByTestId('registrySettings.pluginScope');
  }

  /** Detaches this device's plugin set from the account. */
  async usePluginSetForThisDeviceOnly(): Promise<void> {
    const toggle = this.getPluginScopeToggle();
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();
  }

  async openPluginRegistry(): Promise<void> {
    // Direct-navigate to the registry workspace rather than clicking the
    // pinned tree node. The click path requires the layout/settings
    // operation handlers to be fully registered before the click fires; in
    // firefox that initialisation occasionally lags behind first paint, so
    // the click is silently swallowed and the test then times out waiting
    // for the registry tree to render. URL-driven navigation has no such
    // dependency on operation-handler registration.
    await this.page.goto(workspaceUrl(REGISTRY_WORKSPACE));
    await this.page.getByTestId('pluginRegistry.recommended').waitFor({ state: 'visible' });
  }

  async openRegistryCategory(category: string): Promise<void> {
    // Clicked rather than deep-linked: a cold load of `<workspace>/category/<name>` restores the
    // workspace but not the category plank, so the list never opens.
    await this.openPluginRegistry();
    await this.page.getByTestId(`pluginRegistry.${category}`).click();
    await expect(this.page.locator('[data-testid^="pluginList."]').first()).toBeVisible();
  }

  getPluginToggle(plugin: string): Locator {
    return this.page.getByTestId(`pluginList.${plugin}`).locator('input[type="checkbox"]');
  }

  async changeStorageVersionInMetadata(version: number): Promise<void> {
    await this.page.evaluate(
      ({ version }) => {
        window.composer?.changeStorageVersionInMetadata?.(version);
      },
      { version },
    );

    await this.page.getByTestId('resetDialog').waitFor();
  }

  //
  // Error Boundary
  //

  async reset(): Promise<void> {
    await this.page.getByTestId('resetDialog.reset').click();
    await this.page.getByTestId('resetDialog.confirmReset').click();
  }

  /** The most recent browser console errors, newest last, for embedding in thrown diagnostics. */
  recentConsoleErrors(count = 5): string {
    const tail = this._consoleErrors.slice(-count);
    return tail.length > 0 ? tail.join(' | ') : '(none captured)';
  }

  private async _onConsoleMessage(message: ConsoleMessage): Promise<void> {
    if (message.type() === 'error') {
      this._consoleErrors.push(message.text());
      if (this._consoleErrors.length > 20) {
        this._consoleErrors.shift();
      }
    }
    try {
      const text = message.text();
      const json = JSON.parse(text.slice(text.indexOf('{')));
      if (json.invitationCode) {
        this._invitationCode.wake(json.invitationCode);
      }
      if (json.authCode) {
        this._authCode.wake(json.authCode);
      }
    } catch {}
  }
}
