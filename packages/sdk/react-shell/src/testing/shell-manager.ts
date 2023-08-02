//
// Copyright 2023 DXOS.org
//

import type { Locator, Page, FrameLocator } from '@playwright/test';

type Scope = Locator | FrameLocator | Page;

export class ShellManager {
  page!: Page;

  authenticatorIsVisible(type: 'device' | 'space', scope?: Scope) {
    return (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).isVisible();
  }

  async invitationFailed(scope?: Scope, timeout = 3000) {
    const peer = scope || this.page;
    try {
      await peer.locator('[data-testid=invitation-rescuer-reset]:not([disabled])').waitFor({ timeout });
      return true;
    } catch {
      return false;
    }
  }

  async inputInvitation(type: 'device' | 'space', invitation: string, scope?: Scope) {
    await (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input`).type(invitation);
    await this.page.keyboard.press('Enter');
  }

  async invitationInputContinue(type: 'device' | 'space', scope?: Scope) {
    await (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-input-continue`).click();
  }

  async cancelInvitation(type: 'device' | 'space', kind: 'host' | 'guest', scope?: Scope) {
    if (kind === 'guest') {
      await (scope || this.page)
        .getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-authenticator-cancel`)
        .click();
    } else {
      await (scope || this.page).getByTestId('cancel-invitation').nth(0).click();
    }
  }

  async readyToAuthenticate(type: 'device' | 'space', scope?: Scope, timeout = 3000) {
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

  async authenticateInvitation(type: 'device' | 'space', authCode: string, scope?: Scope) {
    const peer = scope || this.page;
    // TODO(wittjosiah): Update ids.
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).type(authCode);
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-invitation-authenticator-next`).click();
  }

  async clearAuthCode(type: 'device' | 'space', scope?: Scope) {
    const peer = scope || this.page;
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).fill('');
    await peer.getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).focus();
  }

  async resetInvitation(scope?: Scope) {
    await (scope || this.page).getByTestId('invitation-rescuer-reset').click();
  }

  async doneInvitation(type: 'device' | 'space', scope?: Scope) {
    await (scope || this.page)
      .getByTestId(type === 'device' ? 'halo-invitation-accepted-done' : 'space-invitation-accepted-done')
      .click();
  }
}
