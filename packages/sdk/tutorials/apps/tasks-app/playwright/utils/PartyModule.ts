import { AppSimulator } from './AppSimulator';
import { Browser } from './Browser';

export class PartyModule extends AppSimulator {

  async openPartyModal() {
    await this.browser.getPage().click('[aria-label="invite"]');

    const invitationModal = await this.browser.getPage().$('text="Access permissions"');

    expect(invitationModal).toBeDefined();
  }

  async closePartyModal() {
    const isModalOpen = await this.browser.getPage().$('button :text("Done")');

    if (isModalOpen) {
      await this.browser.getPage().click('button :text("Done")');
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
      if (message.text().match(/^.{200,}$/) && !/\s/.test(message.text())) {
        invitationText = message.text();
        return true;
      }

      return false;
    });

    await this.browser.getPage().click('[title="Copy to clipboard"]');

    await this.browser.getPage().$('text="Invite code copied"');

    await invitationPromise;

    expect(invitationText!).toBeDefined();

    return invitationText!;
  }

  async redeemInvitation(invitationCode: string) {
    await this.browser.getPage().click('[title="Redeem invitation"]');

    await this.browser.getPage().fill('textarea', invitationCode);

    await this.browser.getPage().click('button :text("Submit")');
  }

  async checkPinCodeModal() {
    const pinCodeModal = await this.browser.getPage().waitForSelector('text=PIN', { timeout: 5000 })

    expect(pinCodeModal).toBeDefined();
  }

  async getPinCode(): Promise<string> {
    const passcode = await this.browser.getPage().waitForSelector('span:right-of(:text("Passcode"))', { timeout: 5000 })

    expect(passcode).toBeDefined();

    const invitationCode = await passcode.innerText();

    expect(invitationCode).toBeDefined();

    await this.browser.getPage().click('button :text("Done")');

    return invitationCode;
  }

  async enterPinCode(pinCode: string) {
    await this.browser.getPage().fill('.MuiInputBase-input', pinCode);

    const submitButton = await this.browser.getPage().$('button :text("Submit")');

    expect(submitButton).toBeDefined();

    await submitButton?.click();
  }
}
