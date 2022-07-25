//
// Copyright 2021 DXOS.org
//

import { InvitationDescriptor } from '@dxos/client';
import assert from 'node:assert';
import expect from 'expect';

import { AppSimulator } from './AppSimulator';

export class PartyModule extends AppSimulator {

  async openPartyModal() {
    await this.browser.getPage().click('[aria-label="invite"]');

    const invitationModal = await this.browser.getPage().$('text="Access permissions"');

    expect(invitationModal).toBeDefined();
  }

  async closePartyModal() {
    const isModalOpen = await this.browser.getPage().$('button :text("Done")');

    if (isModalOpen) {
      await this.browser.getPage().click('button:has-text("Done")');
    }
  }

  async generateUserInvitation() {
    await this.browser.getPage().click('text="Invite User"');

    const invite = await this.browser.getPage().$('text="Invitation 1"');

    expect(invite).toBeDefined();
  }

  async generateBotInvitation() {
    await this.browser.getPage().click('text="Invite Bot"');

    // todo(grazianoramiro): implement case once is working
  }

  async copyInvitationCode(): Promise<string> {
    let invitationText: string;

    const invitationPromise = this.browser.getPage().waitForEvent('console', message => {
      const text = message.text();
      try {
        const invitation = InvitationDescriptor.decode(text);
        if (!!invitation.hash) {
          invitationText = text;
          return true
        }
        return false;
      } catch {
        return false;
      }
    });

    await this.browser.getPage().click('[title="Invite people"]');
    await this.browser.getPage().click("//*[contains(text(),'Create Invitation')]");
    await this.browser.getPage().click("//*[contains(text(),'Pending invitation')]");

    await invitationPromise;

    expect(invitationText!).toBeDefined();

    return invitationText!;
  }

  async redeemInvitation(invitationCode: string, getPinFromInviter: () => Promise<string>) {
    await this.browser.getPage().click('[title="Redeem invitation"]');

    await this.browser.getPage().fill('#join-dialog-invitation-code', invitationCode);

    await this.browser.getPage().click('button:has-text("Process")');

    await this.enterPinCode(await getPinFromInviter())
  }

  async getPinCode(): Promise<string> {
    await this.browser.getPage().waitForSelector('[title="Copy passcode."]', { timeout: 5000 });
    let pinCode: string;

    const pinCodePromise = this.browser.getPage().waitForEvent('console', message => {
      const text = message.text();
      if (text.length === 4) {
        pinCode = text;
        return true;
      }
      return false;
    });
    await this.browser.getPage().click("//*[contains(text(),'Pending invitation')]", { timeout: 5000 });
    await pinCodePromise
    return pinCode!;
  }

  async enterPinCode(pinCode: string) {
    assert(!!pinCode, 'Missing pinCode')
    await this.browser.getPage().fill("//input[@class='dxos-passcode']", pinCode);
    // It auto-submits after filling passcode without the need to click any "submit" button.
  }
}
