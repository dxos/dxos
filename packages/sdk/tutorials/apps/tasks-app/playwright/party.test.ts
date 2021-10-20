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
  let alice: TaskApp;
  let bob: TaskApp;

  before(() => {
    alice = new TaskApp(new Browser());

    return alice.browser.launch(firefox, initialUrl)
      .then(() => alice.profile.create('Alice'))
      .then(() => alice.checkAppIsLoaded())
      .then(() => alice.createTaskList(listName));
  });

  after(() => alice.browser.get().close());


  describe('As a user that wants to invite a user then', () => {

    it('I should be able to copy the invitation code to clipboard', () => alice.party.copyInvitationCode())

  })

  describe('', () => {
    beforeEach(async () => {
      invitationToken = await alice.party.copyInvitationCode()

      bob = new TaskApp(new Browser());

      await bob.browser.launch(firefox, initialUrl)
        .then(() => bob.profile.checkCreationIsPrompted())
        .then(() => bob.profile.create(`Bob ${chocolatesCounter}`))
        .then(() => bob.checkAppIsLoaded());

      taskName = taskName.replace(`${chocolatesCounter - 1}`, chocolatesCounter.toString())

      chocolatesCounter++
    });

    afterEach(() => bob.browser.get().close());

    describe('As a user that has been invited to a party then', () => {
      it('I should be able to redeem my invitation', async () => {
        await bob.party.redeemInvitation(invitationToken);
      });
    });


    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.checkTaskListIsCreated(listName)
      });

      it('I should be able to create a task on the party list', () => bob.createTask(listName, taskName));
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)
      })

      it('I should be able to see tasks created by others on the party', async () => {
        await alice.checkTaskListIsCreated(listName)

        await alice.checkTaskIsCreated(taskName)
      });
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)
      })

      it('I should be able to check and uncheck tasks on the party list', () => bob.swapTaskState(taskName))
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)

        await bob.swapTaskState(taskName)
      })

      it('I should be able to see tasks checked or unchecked by others', () => alice.checkTaskState(taskName, false));
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)
      })

      it('I should be able to remove tasks on the party list', () => bob.removeTask(taskName));
    });

    describe('As a user that has joined a party then', () => {
      beforeEach(async () => {
        await bob.party.redeemInvitation(invitationToken);

        await bob.checkTaskListIsCreated(listName)

        await bob.createTask(listName, taskName)

        await bob.removeTask(taskName)
      });

      it('I should be able to see tasks removed by others', () => alice.checkTaskExistence(taskName));
    });
  })
});
