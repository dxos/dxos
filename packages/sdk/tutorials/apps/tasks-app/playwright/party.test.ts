//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { Browser, TaskApp } from './utils';

describe('Party Test Cases', () => {
  const initialUrl = 'http://localhost:3000/';
  let chocolatesCounter = 1
  let listName = 'My Party List';
  let taskName = `Buy ${chocolatesCounter} chocolate(s) for the team`;

  let invitationToken: string;
  let pinCode: string;
  let alice: TaskApp;
  let bob: TaskApp;

  beforeAll(() => {
    jest.setTimeout(30000);

    alice = new TaskApp(new Browser());

    return alice.browser.launch(firefox, initialUrl)
      .then(() => alice.profile.create('Alice'))
      .then(() => alice.checkAppIsLoaded())
      .then(() => alice.createTaskList(listName));
  });

  afterAll(() => alice.browser.get().close());

  describe('As a user that wants to invite people to join a party then', () => {
    test('I should be able to see the current users on the party', () => alice.party.openPartyModal());

    afterAll(() => alice.party.closePartyModal());
  });

  describe('As a user that wants to invite a user then', () => {
    beforeAll(() => alice.party.openPartyModal());

    test('I should be able to generate a new user invitation', () => alice.party.generateUserInvitation())

    test('I should be able to copy the invitation code to clipboard', () => alice.party.copyInvitationCode())

    afterAll(() => alice.party.closePartyModal());
  })

  describe.skip('As a user that wants to invite a bot then', () => {
    beforeAll(() => alice.party.openPartyModal());

    // todo(grazianoramiro): figure out why bot select is empty
    test('I should be able to generate a new bot invitation', () => alice.party.generateBotInvitation());

    afterAll(() => alice.party.closePartyModal());
  })

  describe('', () => {
    beforeEach(async () => {
      const aliceStuff = alice.party.openPartyModal()
        .then(() => alice.party.generateUserInvitation())
        .then(async () => invitationToken = await alice.party.copyInvitationCode())

      bob = new TaskApp(new Browser());

      const bobStuff = bob.browser.launch(firefox, initialUrl)
        .then(() => bob.profile.checkCreationIsPrompted())
        .then(() => bob.profile.create(`Bob ${chocolatesCounter}`))
        .then(() => bob.checkAppIsLoaded());

      taskName = taskName.replace(`${chocolatesCounter - 1}`, chocolatesCounter.toString())

      chocolatesCounter++

      await Promise.all([aliceStuff, bobStuff]);
    });

    afterEach(() => Promise.all([alice.party.closePartyModal(), bob.browser.get().close()]));

    describe('As a user that has been invited to a party then', () => {
      test('I should be able to redeem my invitation', async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();
      });
    });

    describe('As a user that has invited another user, and the invitation has been redeemed then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();
      });

      test('I should be able to see the PIN code', () => alice.party.getPinCode());
    });

    describe('As a user that has been invited to a party and redeemed his invitation then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode();
      });

      test('I should be able to enter the PIN code to join the party', async () => {
        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)
      });
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode()

        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)
      });

      test('I should be able to create a task on the party list', () => bob.createTask(listName, taskName));
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode()

        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)
      })

      test('I should be able to see tasks created by others on the party', async () => {
        await alice.checkTaskListIsCreated(listName)

        await alice.checkTaskIsCreated(taskName)
      });
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode()

        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)
      })

      test('I should be able to check and uncheck tasks on the party list', () => bob.swapTaskState(taskName))
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode()

        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)

        await bob.swapTaskState(taskName)
      })

      test('I should be able to see tasks checked or unchecked by others', () => alice.checkTaskState(taskName, false));
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode()

        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)
      })

      test('I should be able to remove tasks on the party list', () => bob.removeTask(taskName));
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.party.checkPinCodeModal();

        pinCode = await alice.party.getPinCode()

        await bob.party.enterPinCode(pinCode)

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)

        await bob.removeTask(taskName)
      });

      test('I should be able to see tasks removed by others', () => alice.checkTaskExistence(taskName));
    });
  })
});
