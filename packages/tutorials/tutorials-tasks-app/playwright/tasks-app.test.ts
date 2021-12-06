//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { Browser, TaskApp } from './utils';

describe('Tasks App Test Cases', () => {
  const initialUrl = 'http://localhost:3000/';

  let alice: TaskApp;

  before(() => {
    alice = new TaskApp(new Browser());

    return alice.browser.launch(firefox, initialUrl)
      .then(() => alice.profile.create('Alice'));
  });

  after(() => alice.browser.get().close());

  describe('As a user with a profile already created then', () => {
    it('I should be presented with the app', () => alice.checkAppIsLoaded())
  });

  describe('As a user with a profile already created then', () => {
    it('I should be able to create a new task list', () => alice.createTaskList("My Example List"))
  });

  describe('As a user with a task list already created', () => {
    const listName = "My Initial Tasks"

    beforeEach(() => alice.createTaskList(listName));

    it('I should be able to add new tasks to the list', () => alice.createTask(listName, "Clone the repo"))
  });

  describe('As a user with a task already created', () => {
    const listName = "My Checked Tasks"
    const taskName = "Install dependencies"

    beforeEach(async () => {
      await alice.createTaskList(listName);

      await alice.createTask(listName, taskName);
    });

    it('I should be able to check and uncheck a task on the list', () => alice.swapTaskState(taskName))
  });

  describe('As a user with a task already created', () => {
    const listName = "My Tasks To Remove"
    const taskName = "Develop and test and break"

    beforeEach(async () => {
      await alice.createTaskList(listName);

      await alice.createTask(listName, taskName);
    });

    it('I should be able to remove a task from the list', () => alice.removeTask(taskName))
  });

});
