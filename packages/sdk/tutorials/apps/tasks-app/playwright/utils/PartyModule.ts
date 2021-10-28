import { decodeInvitation } from '@dxos/react-client';
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
        const invitation = decodeInvitation(text);
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
    await this.browser.getPage().click('[title="Copy to clipboard"]');

    await invitationPromise;

    expect(invitationText!).toBeDefined();

    return invitationText!;
  }

  async redeemInvitation(invitationCode: string, getPinFromInviter: () => Promise<string>) {
    await this.browser.getPage().click('[title="Redeem invitation"]');

    await this.browser.getPage().fill('textarea', invitationCode);

    await this.browser.getPage().click('button:has-text("Process")');

    await this.enterPinCode(await getPinFromInviter())
  }

  async getPinCode(): Promise<string> {
    const passcode = await this.browser.getPage().waitForSelector('#party-invitation-dialog-pin', { timeout: 5000 });

    expect(passcode).toBeDefined();

    const pinCode = await passcode.innerText();

    expect(pinCode).toBeDefined();

    return pinCode;
  }

  async enterPinCode(pinCode: string) {
    await this.browser.getPage().fill('input', pinCode);
    await this.browser.getPage().click('button:has-text("Submit")');
  }
}
