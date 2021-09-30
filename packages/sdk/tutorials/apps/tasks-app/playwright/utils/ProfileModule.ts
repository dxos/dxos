import { AppSimulator } from './AppSimulator';

export class ProfileModule extends AppSimulator {
  async checkCreationIsPrompted() {
    const createProfileModal = await this.browser.getPage().$('text="Create Profile"');

    expect(createProfileModal).toBeDefined();
  }

  async create(username: string) {
    await this.browser.getPage().fill('input:below(:text("Create Profile"))', username);

    const submitButton = await this.browser.getPage().$('button:has-text("Create")');

    expect(submitButton).toBeDefined();

    const isButtonEnabled = await submitButton?.isEnabled();

    expect(isButtonEnabled).toBeTruthy();

    await submitButton?.click();
  }

  async resetStorage() {
    const moreButton = await this.browser.getPage().$('button[title="More Options"]');

    expect(moreButton).toBeDefined();
    await moreButton?.click();

    const resetStorage = await this.browser.getPage().$('button[title="Reset Storage Button"]');

    expect(resetStorage).toBeDefined();
    
    await resetStorage?.click();
  }
}
