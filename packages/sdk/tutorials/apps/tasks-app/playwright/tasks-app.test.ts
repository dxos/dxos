//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { Browser, TaskApp } from './utils';

describe('Tasks App', () => {
  const initialUrl = 'http://localhost:3000/';
  const listName = 'My Testing List';
  const taskName = 'Buy some chocolate for the kids';

  let invitationToken: string;
  let pinCode: string;
  let alice: TaskApp;
  let bob: TaskApp;

  beforeAll(() => {
    jest.setTimeout(30000);

    alice = new TaskApp(new Browser());
    bob = new TaskApp(new Browser());

    return alice.browser.launch(firefox, initialUrl);
  });

  afterAll(() => Promise.all([
    alice.browser.get().close(),
    bob.browser.get() && bob.browser.get().close()
  ]));

  describe('Profile - As a new user starting the app then', () => {
    test('I should be prompted to create my profile', () => alice.profile.checkCreationIsPrompted())

    test('I should be able to create my profile', () => alice.profile.create('Alice'))
  })

  describe('Tasks List - As a user with a profile already created then', () => {
    test('I should be presented with the app', () => alice.checkAppIsLoaded())

    test('I should be able to create a new task list', () => alice.createTaskList(listName))

    test('I should be able to add new tasks to the list', () => alice.createTask(listName, taskName))

    test('I should be able to check and uncheck a task on the list', () => alice.swapTaskState(taskName))

    test('I should be able to remove a task from the list', () => alice.removeTask(taskName))
  });

  describe('Party - As a user that wants to invite people to join a party then', () => {
    test('I should be able to see the current users on the party', () => alice.party.checkCurrentUsers())

    describe('User Invitation', () => {
      test('I should be able to generate a new user invitation', () => alice.party.generateUserInvitation())

      test('I should be able to copy the invitation code to clipboard', async () => invitationToken = await alice.party.copyInvitationCode())
    })

    describe.skip('Bot Invitation', () => {
      // todo(grazianoramiro): figure out why bot select is empty
      test('I should be able to generate a new bot invitation', () => alice.party.generateBotInvitation());
    })
  });

  describe('Party - As a user that has been invited to a party then', () => {
    beforeAll(async () => {
      await bob.browser.launch(firefox, initialUrl);

      await bob.profile.checkCreationIsPrompted();

      await bob.profile.create('Bob');

      await bob.checkAppIsLoaded();
    });

    test('I should be able to redeem my invitation', () => bob.party.redeemInvitation(invitationToken));

    test('The user who invited me, should be able to see the PIN code', async () => pinCode = await alice.party.getPinCode());

    test('I should be able to enter the PIN code to join the party', () => bob.party.enterPinCode(pinCode));

    test('I should be able to see the party task list', () => bob.checkTaskListIsCreated(listName));

    test('I should be able to create a task on the party list', () => bob.createTask(listName, taskName));

    test('And it should be seen by everyone in the party', () => alice.checkTaskIsCreated(taskName));

    test('I should be able to check and uncheck a task on the list', () => bob.swapTaskState(taskName))

    test('And it should be seen by everyone in the party', () => alice.checkTaskState(taskName, false));

    test('I should be able to remove a task from the list', () => bob.removeTask(taskName));

    test('And it should be seen by everyone in the party', () => alice.checkTaskExistence(taskName));
  });
});
