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
    // An invitation that fails outright routes the panel to its rescuer view. `Viewport.View` marks
    // every inactive view `invisible`, so the auth-code input stays mounted but never becomes
    // visible — waiting on it alone burns the full timeout and then reports a stall, which is the
    // wrong diagnosis. Race the rescuer so a failed invitation is named as one immediately (DX-1264).
    // Scoped to this kind's rescuer view: the panel mounts the Halo and Space rescuers at once and
    // both carry this testid, so an unscoped locator matches two elements the moment either has a
    // fail reason — a strict-mode violation that would surface as the stall misdiagnosis below.
    const rescuer = peer
      .locator(`#${type === 'device' ? 'halo' : 'space'}-invitation-rescuer`)
      .getByTestId('invitation-rescuer-reset');
    const inputVisible = input.waitFor({ state: 'visible' });
    const rescuerVisible = rescuer.waitFor({ state: 'visible' });
    // Whichever loses the race still rejects on its own timeout later; give each a handler now so
    // that rejection is never unhandled. The race keeps using the originals.
    void inputVisible.catch(() => {});
    void rescuerVisible.catch(() => {});
    // A rejection here is normally the timeout with neither arm showing, which the inventory below
    // explains; `Promise.race` also surfaces an early failure from either arm (a navigation mid-wait,
    // say) the same way, hence reporting what the shell was showing rather than asserting a cause.
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
