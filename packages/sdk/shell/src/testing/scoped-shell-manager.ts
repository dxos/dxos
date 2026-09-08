//
// Copyright 2023 DXOS.org
//

import type { FrameLocator, Locator, Page } from '@playwright/test';

type Scope = Locator | FrameLocator | Page;

/** @deprecated */
export class ScopedShellManager {
  page!: Page;

  authenticatorIsVisible(type: 'device' | 'space', scope?: Scope): Promise<boolean> {
    return (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).isVisible();
  }

  async invitationFailed(scope?: Scope, timeout = 3000): Promise<boolean> {
    const peer = scope || this.page;
    try {
      await peer.locator('[data-testid=invitation-rescuer-reset]:not([disabled])').waitFor({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  async inputInvitation(type: 'device' | 'space', invitation: string, scope?: Scope): Promise<void> {
    await (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input`).fill(invitation);
    await this.page.keyboard.press('Enter');
  }

  async invitationInputContinue(type: 'device' | 'space', scope?: Scope): Promise<void> {
    await (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input-continue`).click();
  }

  async cancelInvitation(type: 'device' | 'space', kind: 'host' | 'guest', scope?: Scope): Promise<void> {
    if (kind === 'guest') {
      await (scope || this.page)
        .getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-authenticator-cancel`)
        .click();
    } else {
      await (scope || this.page).getByTestId('cancel-invitation').nth(0).click();
    }
  }

  async readyToAuthenticate(type: 'device' | 'space', scope?: Scope, timeout = 3000): Promise<boolean> {
    const peer = scope || this.page;
    try {
      await peer
        .locator(`[data-testid=${type === 'device' ? 'halo' : 'space'}-auth-code-input]:not([disabled])`)
        .waitFor({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  async authenticateInvitation(type: 'device' | 'space', authCode: string, scope?: Scope): Promise<void> {
    const peer = scope || this.page;
    // TODO(wittjosiah): Update ids.
    const input = peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`);
    // An invitation that fails outright renders the rescuer's error screen, where the auth-code input
    // stays mounted but disabled — so waiting on the input alone burns the full timeout and then
    // reports a stall, which is the wrong diagnosis. Race the rescuer so a failed invitation is named
    // as one immediately (DX-1264).
    const rescuer = peer.getByTestId('invitation-rescuer-reset');
    const inputVisible = input.waitFor({ state: 'visible' });
    const rescuerVisible = rescuer.waitFor({ state: 'visible' });
    // Whichever loses the race still rejects on its own timeout later; give each a handler now so
    // that rejection is never unhandled. The race keeps using the originals.
    void inputVisible.catch(() => {});
    void rescuerVisible.catch(() => {});
    // Only a rejection here means neither appeared — that is the stall the inventory below explains.
    const outcome = await Promise.race([
      inputVisible.then(() => 'ready' as const),
      rescuerVisible.then(() => 'failed' as const),
    ]).catch(async (err) => {
      const showing = await peer
        .locator('[data-testid]')
        .evaluateAll((elements) => [...new Set(elements.map((element) => element.dataset.testid))].join(', '))
        .catch(() => '(unavailable)');
      throw new Error(`${type} invitation never reached the auth-code step; shell is showing: ${showing}`, {
        cause: err,
      });
    });
    if (outcome === 'failed') {
      throw new Error(`${type} invitation failed; the shell is offering to start over`);
    }
    await input.fill(authCode);
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-authenticator-next`).click();
  }

  async clearAuthCode(type: 'device' | 'space', scope?: Scope): Promise<void> {
    const peer = scope || this.page;
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).fill('');
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).focus();
  }

  async resetInvitation(scope?: Scope): Promise<void> {
    await (scope || this.page).getByTestId('invitation-rescuer-reset').click();
  }

  async doneInvitation(type: 'device' | 'space', scope?: Scope): Promise<void> {
    await (scope || this.page)
      .getByTestId(type === 'device' ? 'halo-invitation-accepted-done' : 'space-invitation-accepted-done')
      .click();
  }
}
