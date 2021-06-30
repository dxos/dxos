//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { Browser } from './utils';

describe('Tasks App', () => {
  const initialUrl = 'http://localhost:3000/';
  const listName = 'My Testing List';
  const taskName = 'Buy some chocolate for the kids';
  let invitationText: string;
  let invitationCode: string;
  let alice: Browser;
  let bob: Browser;

  beforeAll(() => {
    jest.setTimeout(30000);

    alice = new Browser();
    bob = new Browser();

    return alice.launchBrowser(firefox, initialUrl);
  });

  afterAll(() => Promise.all([
    alice.getBrowser().close(),
    bob.getBrowser() && bob.getBrowser().close()
  ]));

  describe('Profile - As a new user starting the app then', () => {
    test('I should be prompted to create my profile', async () => {
      const createProfileModal = await alice.getPage().$('text="Create Profile"');

      expect(createProfileModal).toBeDefined();
    })

    test('I should be able to create my profile', async () => {
      await alice.getPage().fill('.MuiInputBase-input', 'Alice');

      const submitButton = await alice.getPage().$('.MuiButtonBase-root :text("Create")');

      expect(submitButton).toBeDefined();

      const isButtonEnabled = await submitButton?.isEnabled();

      expect(isButtonEnabled).toBeTruthy();

      await submitButton?.click();
    })
  })

  describe('Tasks List - As a user with a profile already created then', () => {
    test('I should be presented with the app', async () => {
      const header = await alice.getPage().waitForSelector('text="Tasks App"', { timeout: 5000 });

      expect(header).toBeDefined();
    })

    test('I should be able to create a new task list', async () => {
      await alice.getPage().click('button[title="Create list"]');

      const createListModal = await alice.getPage().$('h2 :text("Create List")');

      expect(createListModal).toBeDefined();

      await alice.getPage().fill('.MuiInputBase-input', listName);

      await alice.getPage().click('.MuiButtonBase-root :text("Create")');

      const createdList = await alice.getPage().waitForSelector(`li :text("${listName}")`, { timeout: 5000 })

      expect(createdList).toBeDefined();
    })

    test('I should be able to add new tasks to the list', async () => {
      await alice.getPage().click(`li :text("${listName}")`);

      await alice.getPage().fill('.MuiInputBase-input', taskName);

      await alice.getPage().click('[aria-label="create"]');

      const createdTask = await alice.getPage().$(`text="${taskName}"`);

      expect(createdTask).toBeDefined();
    })

    test('I should be able to check and uncheck a task on the list', async () => {
      const taskCheckbox = await alice.getPage().$(`input:left-of(:text("${taskName}"))`);

      expect(taskCheckbox).toBeDefined();

      expect(await taskCheckbox?.isChecked()).toBeFalsy();

      await taskCheckbox?.check();

      expect(await taskCheckbox?.isChecked()).toBeTruthy();

      await taskCheckbox?.uncheck();

      expect(await taskCheckbox?.isChecked()).toBeFalsy();
    })

    test('I should be able to remove a task from the list', async () => {
      const taskTrash = await alice.getPage().$(`button:right-of(:text("${taskName}"))`);

      expect(taskTrash).toBeDefined();

      await taskTrash?.click();

      const task = await alice.getPage().$(`text="${taskName}"`);

      expect(task).toBeNull();
    });
  });

  describe('Party - As a user that wants to invite people to join a party then', () => {
    test('I should be able to see the current users on the party', async () => {
      await alice.getPage().click('[aria-label="invite"]');

      const invitationModal = await alice.getPage().$('text="Access permissions"');

      expect(invitationModal).toBeDefined();
    })

    describe('User Invitation', () => {
      test('I should be able to generate a new user invitation', async () => {
        await alice.getPage().click('text="Invite User"');

        const invite = await alice.getPage().$('text="Invitation 1"');

        expect(invite).toBeDefined();
      });

      test('I should be able to copy the invitation code to clipboard', async () => {
        const invitationPromise = alice.getPage().waitForEvent('console', message => {
          if (message.text().match(/^.{200,}$/) && !/\s/.test(message.text())) {
            invitationText = message.text();
            return true;
          }

          return false;
        });

        await alice.getPage().click('[title="Copy to clipboard"]');

        await alice.getPage().$('text="Invite code copied"');

        await invitationPromise;

        expect(invitationText!).toBeDefined();
      });
    })

    describe.skip('Bot Invitation', () => {
      test('I should be able to generate a new bot invitation', async () => {
        await alice.getPage().click('text="Invite Bot"');

        // todo(grazianoramiro): figure out why bot select is empty
      });
    })
  });

  describe('Party - As a user that has been invited to a party then', () => {
    beforeAll(async () => {
      await bob.launchBrowser(firefox, initialUrl);

      const createProfileModal = await bob.getPage().$('text="Create Profile"');

      expect(createProfileModal).toBeDefined();

      await bob.getPage().fill('.MuiInputBase-input', 'Bob');

      const submitButton = await bob.getPage().$('.MuiButtonBase-root :text("Create")');

      expect(submitButton).toBeDefined();

      const isButtonEnabled = await submitButton?.isEnabled();

      expect(isButtonEnabled).toBeTruthy();

      await submitButton?.click();

      const header = await bob.getPage().waitForSelector('text="Tasks App"', { timeout: 5000 });

      expect(header).toBeDefined();
    });

    test('I should be able to redeem my invitation', async () => {
      await bob.getPage().click('[title="Redeem invitation"]');

      await bob.getPage().fill('textarea', invitationText);

      await bob.getPage().click('button :text("Submit")');
    });

    test('The user who invited me, should be able to see the PIN code', async () => {
      const passcode = await alice.getPage().waitForSelector('span:right-of(:text("Passcode"))', { timeout: 5000 })

      expect(passcode).toBeDefined();

      invitationCode = await passcode.innerText();

      expect(invitationCode).toBeDefined();

      await alice.getPage().click('button :text("Done")');
    });

    test('I should be able to enter the PIN code to join the party', async () => {
      await bob.getPage().fill('.MuiInputBase-input', invitationCode);

      const submitButton = await bob.getPage().$('button :text("Submit")');

      expect(submitButton).toBeDefined();

      await submitButton?.click();
    });

    test('I should be able to see the party task list', async () => {
      const partyList = await bob.getPage().waitForSelector(`li :text("${listName}")`, { timeout: 5000 })

      expect(partyList).toBeDefined();

      await bob.getPage().click(`li :text("${listName}")`);
    });

    test('I should be able to create a task on the party list', async () => {
      await bob.getPage().fill('.MuiInputBase-input', taskName);

      await bob.getPage().click('[aria-label="create"]');

      const createdTask = await bob.getPage().$(`text="${taskName}"`);

      expect(createdTask).toBeDefined();
    });

    test('And it should be seen by everyone in the party', async () => {
      const createdTask = await alice.getPage().$(`text="${taskName}"`);

      expect(createdTask).toBeDefined();
    });

    test('I should be able to check and uncheck a task on the list', async () => {
      const taskCheckbox = await bob.getPage().$(`input:left-of(:text("${taskName}"))`);

      expect(taskCheckbox).toBeDefined();

      expect(await taskCheckbox?.isChecked()).toBeFalsy();

      await taskCheckbox?.check();

      expect(await taskCheckbox?.isChecked()).toBeTruthy();

      await taskCheckbox?.uncheck();

      expect(await taskCheckbox?.isChecked()).toBeFalsy();
    })

    test('And it should be seen by everyone in the party', async () => {
      const taskCheckbox = await alice.getPage().$(`input:left-of(:text("${taskName}"))`);

      expect(taskCheckbox).toBeDefined();

      expect(await taskCheckbox?.isChecked()).toBeFalsy();
    });

    test('I should be able to remove a task from the list', async () => {
      const taskTrash = await bob.getPage().$(`button:right-of(:text("${taskName}"))`);

      expect(taskTrash).toBeDefined();

      await taskTrash?.click();

      const task = await bob.getPage().$(`text="${taskName}"`);

      expect(task).toBeNull();
    });

    test('And it should be seen by everyone in the party', async () => {
      const task = await alice.getPage().$(`text="${taskName}"`);

      expect(task).toBeNull();
    });
  });
});
