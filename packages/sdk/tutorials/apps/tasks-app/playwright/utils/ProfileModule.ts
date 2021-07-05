import { AppSimulator } from './AppSimulator';

export class ProfileModule extends AppSimulator {
  async checkCreationIsPrompted() {
    const createProfileModal = await this.browser.getPage().$('text="Create Profile"');

    expect(createProfileModal).toBeDefined();
  }

  async create(username: string) {
    await this.browser.getPage().fill('.MuiInputBase-input', username);

    const submitButton = await this.browser.getPage().$('.MuiButtonBase-root :text("Create")');

    expect(submitButton).toBeDefined();

    const isButtonEnabled = await submitButton?.isEnabled();

    expect(isButtonEnabled).toBeTruthy();

    await submitButton?.click();
  }
}
