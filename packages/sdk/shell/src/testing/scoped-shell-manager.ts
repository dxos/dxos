//
// Copyright 2023 DXOS.org
//

import type { FrameLocator, Locator, Page } from '@playwright/test';

type Scope = Locator | FrameLocator | Page;

/**
 * The rescuer renderings that end the flow. Its third, the connecting branch carrying
 * `invitation-rescuer-cancel`, is not one: every invitation passes through it on the way to the auth
 * code.
 */
const RESCUER_DEAD_ENDS =
  "[data-testid='invitation-rescuer-reset']:visible, [data-testid='invitation-rescuer-blank-reset']:visible";

/** Covers the swarm connection, introduction and authenticator handshake the guest waits through. */
const AUTH_CODE_TIMEOUT = 30_000;

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
    // Every step stays mounted and inactive ones are hidden, so only a visible input or rescuer counts.
    const input = peer.locator(`[data-testid='${type === 'device' ? 'halo' : 'space'}-auth-code-input']:visible`);
    const deadEnd = peer.locator(RESCUER_DEAD_ENDS);
    await input.or(deadEnd).first().waitFor({ state: 'visible', timeout: AUTH_CODE_TIMEOUT });
    if (await deadEnd.first().isVisible()) {
      throw new Error(`${type} invitation stopped at the rescuer screen rather than the auth-code step`);
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
