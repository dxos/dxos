//
// Copyright 2023 DXOS.org
//

import type { Locator, Page, FrameLocator } from 'playwright';

type Scope = Locator | FrameLocator | Page;

export class ShellManager {
  page!: Page;

  // TODO(wittjosiah): Type => kind enum.
  authenticatorIsVisible(type: 'device' | 'space', scope?: Scope) {
    return (scope || this.page).getByTestId(`${type === 'device' ? 'halo' : 'space'}-auth-code-input`).isVisible();
  }

  invitationFailed(scope?: Scope) {
    return (scope || this.page).getByTestId('invitation-rescuer-reset').isVisible();
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
