//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { baseUrl, Browser, TaskApp } from './utils';

describe('Storage Test Cases', () => {
  let alice: TaskApp;

  before(async () => {
    alice = new TaskApp(new Browser());

    await alice.browser.launch(firefox, baseUrl);

    alice.browser.getPage().on('dialog', dialog => {
      if (dialog.message() === 'Are you sure you want to reset storage?') {
        dialog.accept();
      }
    });

    await alice.profile.checkCreationIsPrompted();
  });

  after(() => alice.browser.get().close());

  [
    { profileName: 'Alice 1', listName: 'My Example List 1', taskName: 'Clone the repo 1', },
    { profileName: 'Alice 2', listName: 'My Example List 2', taskName: 'Clone the repo 2', },
    { profileName: 'Alice 3', listName: 'My Example List 3', taskName: 'Clone the repo 3', },
    { profileName: 'Alice 4', listName: 'My Example List 4', taskName: 'Clone the repo 4', },
    { profileName: 'Alice 5', listName: 'My Example List 5', taskName: 'Clone the repo 5', },
  ].map(({ profileName, listName, taskName }) => describe(`As a user ${profileName} with a profile and items created then`, () => {
    beforeEach(async () => {
      await alice.profile.create(profileName).then(() => alice.checkAppIsLoaded());

      await alice.createTaskList(listName);

      await alice.createTask(listName, taskName);
    });

    it('I should be able to reset my storage', async () => {
      await alice.profile.resetStorage()
      await alice.profile.checkCreationIsPrompted();
    });
  }))
});

