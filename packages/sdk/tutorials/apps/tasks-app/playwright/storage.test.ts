//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { Browser, TaskApp } from './utils';

describe('Storage Test Cases', () => {
  const initialUrl = 'http://localhost:3000/';
  let alice: TaskApp;

  beforeAll(async () => {
    jest.setTimeout(30000);
    alice = new TaskApp(new Browser());

    await alice.browser.launch(firefox, initialUrl);

    alice.browser.getPage().on('dialog', dialog => {
      if (dialog.message() === 'Are you sure you want to reset storage?') {
        dialog.accept();
      }
    });

    await alice.profile.checkCreationIsPrompted();
  });

  afterAll(() => alice.browser.get().close());

  describe.each([
    { profileName: 'Alice 1', listName: 'My Example List 1', taskName: 'Clone the repo 1', },
    { profileName: 'Alice 2', listName: 'My Example List 2', taskName: 'Clone the repo 2', },
    { profileName: 'Alice 3', listName: 'My Example List 3', taskName: 'Clone the repo 3', },
    { profileName: 'Alice 4', listName: 'My Example List 4', taskName: 'Clone the repo 4', },
    { profileName: 'Alice 5', listName: 'My Example List 5', taskName: 'Clone the repo 5', },
  ])('As a user with a profile and items created then (%#: %j)', ({ profileName, listName, taskName }) => {
    beforeEach(async () => {
      await alice.profile.create(profileName).then(() => alice.checkAppIsLoaded());

      await alice.createTaskList(listName);

      await alice.createTask(listName, taskName);
    });

    test('I should be able to reset my storage', async () => {
      await alice.profile.resetStorage()
      await alice.profile.checkCreationIsPrompted();
    });
  });
});

