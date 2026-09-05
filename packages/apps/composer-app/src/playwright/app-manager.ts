//
// Copyright 2023 DXOS.org
//

import { type Browser, type ConsoleMessage, type Frame, type Locator, type Page, expect } from '@playwright/test';
import os from 'node:os';

import { Trigger } from '@dxos/async';
import { ShellManager } from '@dxos/shell/testing';
import { setupPage } from '@dxos/test-utils/playwright';

import { DeckManager } from './plugins';

// TODO(wittjosiah): Normalize data-testids between snake and camel case.
// TODO(wittjosiah): Consider structuring tests in such that they could be run with different sets of plugins enabled.

// TODO(wittjosiah): Beware that sometimes the playwright chromium seems to appear as Windows.
//   At least via `navigator.userAgent.platform`.
const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';

export const INITIAL_URL = 'http://localhost:4173';

// `GraphPath.pinnedWorkspaceId('dxos:plugin-registry')`, restated so this page-object does not import
// the registry plugin (its module graph reaches packages that fail to load under playwright's loader).
const REGISTRY_WORKSPACE = '!dxos:plugin-registry';

// `UrlPath.WORKSPACE_KEY` — the pair-chain anchor segment, restated for the same reason.
const WORKSPACE_KEY = 'w';

/** Builds the pair-chain base for a workspace: `/<anchor>/<workspace>`. */
const workspaceUrl = (workspace: string) => `${INITIAL_URL.replace(/\/$/, '')}/${WORKSPACE_KEY}/${workspace}`;

// Only the default space is seeded on every new identity. The exemplar space is skipped on
// localhost (see OnboardingPlugin `generateSampleSpace`), which is where e2e tests run.
export const INITIAL_SPACE_COUNT = 1;

/**
 * Budget for `joinNewIdentity()`: spans a storage reset, page reload and app boot, so it is sized well
 * above the 30s `actionTimeout` a single interaction gets.
 */
const JOIN_IDENTITY_BOOT_TIMEOUT = 60_000;

/** The default space's Home, which a first-run boot lands on. */
const DEFAULT_WORKSPACE_URL = /\/w\/[A-Z0-9]{20,}\/home/;

/**
 * How long the URL must hold still before boot counts as finished. Comfortably over the gaps between
 * boot's own navigations, which have run to a few hundred milliseconds.
 */
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
    private readonly _browser: Browser,
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

  /**
   * Waits out the boot-time navigation to the default space.
   *
   * `init()` returns as soon as the shell renders, but spaces resolve seconds later and the app
   * opens the default one when they do — replacing whatever route ran in the meantime. Anything that
   * navigates early (settings, the registry) has to let that land first or it is silently undone.
   *
   * Arriving is not one step: `plugin-space` resolves the workspace sentinel, and switching to a
   * workspace opens its first openable child in turn, so the URL moves more than once before it
   * settles. Wait for it to STOP moving rather than for its first sign of having arrived. A reader
   * is never inside those gaps — they close long before anyone finds the settings button — but
   * Playwright clicks within milliseconds of a URL change, and a click landing between two of boot's
   * own writes is undone by the later one.
   */
  async waitForDefaultWorkspace(): Promise<void> {
    let lastNavigation = Date.now();
    const onNavigated = (frame: Frame) => {
      if (frame === this.page.mainFrame()) {
        lastNavigation = Date.now();
      }
    };

    this.page.on('framenavigated', onNavigated);
    try {
      await this.page.waitForURL(DEFAULT_WORKSPACE_URL, { timeout: 60_000 });
      await expect
        .poll(() => Date.now() - lastNavigation, { timeout: 30_000, intervals: [50] })
        .toBeGreaterThanOrEqual(BOOT_QUIET_PERIOD);
    } finally {
      this.page.off('framenavigated', onNavigated);
    }

    // Boot settled where it was supposed to: anything else means it is still moving, and every
    // navigation this suite makes from here would be racing it.
    await expect(this.page).toHaveURL(DEFAULT_WORKSPACE_URL);
  }

  /**
   * Waits out the same boot navigation for a device that has just joined an existing identity.
   * Such a device adopts the inviter's workspace and stops at its root, never reaching the `/home`
   * plank a first-run device lands on, so it needs the looser pattern. There is no first-run seeding
   * on this path and so no scheduled expose to wait out.
   */
  async waitForJoinedWorkspace(): Promise<void> {
    await this.page.waitForURL(/\/w\/[A-Z0-9]{20,}/, { timeout: 60_000 });
  }

  async openUserAccount(): Promise<void> {
    await this.page.getByTestId('clientPlugin.account').click();
  }

  async openUserDevices(): Promise<void> {
    await this.openUserAccount();
    await this.page.getByTestId('clientPlugin.devices').click();
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

    // A polling assertion rather than `waitFor`, because confirming reloads the page and a single
    // wait issued beforehand binds to the document being torn down.
    await expect(this.shell.shell.getByTestId('halo-invitation-input')).toBeVisible({
      timeout: JOIN_IDENTITY_BOOT_TIMEOUT,
    });
  }

  async shareSpace(): Promise<void> {
    // Members is nested under the Settings section in the navtree. Scope
    // the generic treeItem.toggle / treeItem.heading testids to the
    // settings/members rows by their row testids, and expand settings
    // first if its members heading isn't visible yet.
    const membersHeading = this.currentWorkspace
      .getByTestId('spacePlugin.members')
      .first()
      .getByTestId('treeItem.heading')
      .first();
    if (!(await membersHeading.isVisible())) {
      await this.currentWorkspace
        .getByTestId('spacePlugin.settings')
        .first()
        .getByTestId('treeItem.toggle')
        .first()
        .click();
    }
    await membersHeading.click();
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
    await this.page.getByTestId('toast.action').nth(nth).click();
  }

  async closeToast(nth = 0): Promise<void> {
    await this.page.getByTestId('toast.close').nth(nth).click();
  }

  //
  // Spaces
  //

  async createSpace({ timeout = 10_000 }: { timeout?: number } = {}): Promise<void> {
    // `init()` only waits for `treeView.userAccount`, so the space list is still empty for a moment
    // after boot and a baseline taken there undercounts.
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
    await this.page.getByTestId('spacePlugin.addSpace').click();
    await this.page.getByTestId('spacePlugin.createSpace').click();

    const form = this.page.getByTestId('create-space-form');
    const save = form.getByTestId('save-button');
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
  async openSpaceSettings(): Promise<void> {
    const generalHeading = this.currentWorkspace
      .getByTestId('spacePlugin.general')
      .first()
      .getByTestId('treeItem.heading')
      .first();
    if (!(await generalHeading.isVisible())) {
      await this.currentWorkspace
        .getByTestId('spacePlugin.settings')
        .first()
        .getByTestId('treeItem.toggle')
        .first()
        .click();
    }
    await generalHeading.click();
  }

  /**
   * Deletes the space at the given index (default: the first non-default space) via its
   * settings danger zone, including the confirmation step.
   */
  async deleteSpace(nth = 1): Promise<void> {
    // Select the space so its Settings section is available in the navtree.
    await this.getSpaceItems().nth(nth).click();
    await this.openSpaceSettings();
    await this.page.getByTestId('spaceSettings.deleteSpace').click();
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

  toggleCollectionCollapsed(nth = 0, delay = 100): Promise<void> {
    return this.getObjectLinks().nth(nth).getByRole('button').first().click({ delay });
  }

  async toggleSection(testId: string, delay = 100, timeout = 15_000): Promise<void> {
    const section = this.currentWorkspace.getByTestId(testId);
    await section.waitFor({ state: 'attached', timeout });
    await section.getByRole('button').first().click({ delay });
  }

  async createObject({ type, name, nth }: { type: string; name?: string; nth?: number }): Promise<void> {
    if (nth !== undefined) {
      const object = this.getObjectLinks().nth(nth);
      await object.hover();
      await object
        .getByTestId(/navtree\.treeItem\.actionsLevel\d+/)
        .first()
        .click();
      await this.page.keyboard.press('ArrowDown');
      await this.page.getByTestId('spacePlugin.createObject').last().focus();
      await this.page.keyboard.press('Enter');
    } else {
      await this.currentWorkspace.getByTestId('spacePlugin.createObject').first().click();
    }

    const option = this.page.getByTestId(`create-object-form.type.${OBJECT_TYPENAMES[type]}`);
    await option.click({ timeout: 15_000 });

    const objectForm = this.page.getByTestId('create-object-form');
    if (!(await objectForm.isVisible())) {
      return;
    }

    if (name) {
      await objectForm.getByLabel('Name').fill(name);
    }
    await objectForm.getByTestId('save-button').click();
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
    // TODO(thure): For some reason, actions move around when simulating the mouse in Firefox.
    await this.page.keyboard.press('ArrowDown');
    await this.page.getByTestId('spacePlugin.renameObject').last().focus();
    await this.page.keyboard.press('Enter');
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
    // TODO(thure): For some reason, actions move around when simulating the mouse in Firefox.
    await this.page.keyboard.press('ArrowDown');
    await this.page.getByTestId('spacePlugin.deleteObject').last().focus();
    await this.page.keyboard.press('Enter');
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

  async dragTo(active: Locator, over: Locator, offset: { x: number; y: number } = { x: 0, y: 0 }): Promise<void> {
    const box = await over.boundingBox();
    if (box) {
      await active.hover();
      await this.page.mouse.down();
      // Timeouts are for input discretization in WebKit
      await this.page.waitForTimeout(100);
      await this.page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
    }
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

  /** The scope toggle group in a settings panel's heading: one item per scope, the active one pressed. */
  getSettingsScopeToggle(scope: 'synced' | 'local'): Locator {
    return this.page.getByTestId(`settingsScope.${scope}`);
  }

  /**
   * Takes the open settings panel off the account. Leaving is lossless and immediate, so unlike
   * rejoining it has no confirmation to dismiss.
   */
  async useSettingsForThisDeviceOnly(): Promise<void> {
    const local = this.getSettingsScopeToggle('local');
    await expect(local).toBeVisible();
    await local.click();
    await expect(local).toHaveAttribute('data-state', 'on');
  }

  /**
   * Puts the open settings panel back under the account, confirming the prompt. Rejoining discards
   * this device's values, which is why this direction asks.
   */
  /**
   * Rejoins the account for the open settings panel, keeping the account's values.
   *
   * The confirmation only appears when the two sides actually differ; with nothing to decide the
   * rejoin just happens, so the dialog is dismissed only if it opened.
   */
  async rejoinAccountSettings(): Promise<void> {
    await this.getSettingsScopeToggle('synced').click();
    const keepShared = this.page.getByTestId('settingsScope.keepShared');
    if (await keepShared.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await keepShared.click();
    }
    await expect(this.getSettingsScopeToggle('synced')).toHaveAttribute('data-state', 'on');
  }

  /** Rejoins the account but publishes this device's values to it, from the conflict dialog. */
  async rejoinAccountSettingsKeepingLocal(): Promise<void> {
    await this.getSettingsScopeToggle('synced').click();
    await this.page.getByTestId('settingsScope.keepLocal').click();
    await expect(this.getSettingsScopeToggle('synced')).toHaveAttribute('data-state', 'on');
  }

  /** The registry's dev-plugin URL field — an ordinary synced plugin setting. */
  getDevPluginUrlInput(): Locator {
    return this.page.getByTestId('registrySettings.devPluginUrl');
  }

  /**
   * The "use a different plugin set on this device" switch in the registry's settings panel. Absent
   * until the settings space opens, which is what backs the device-synced settings store.
   */
  getPluginScopeToggle(): Locator {
    return this.page.getByTestId('registrySettings.pluginScope');
  }

  /**
   * Detaches this device's plugin set from the account. Leaving is lossless and immediate; only
   * rejoining prompts, so this path has no confirmation to dismiss.
   */
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
    // workspace but not the category plank, so the list never opens. The category's tree node is
    // present either way, so the open list is the only thing worth waiting on.
    await this.openPluginRegistry();
    // The row is itself the tree's control since the Ark rebuild — it holds no nested button.
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
