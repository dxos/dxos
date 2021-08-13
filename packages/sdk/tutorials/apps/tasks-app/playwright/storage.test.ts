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
  });

  afterAll(() => alice.browser.get().close());

  describe('As a new user starting the app then', () => {
    test('I should be prompted to create my profile', () => alice.profile.checkCreationIsPrompted())

    test('I should be able to create my profile', () =>
      alice.profile.create('Alice')
        .then(() => alice.checkAppIsLoaded())
    )
  });

  describe('As a user with a profile already created then', () => {
    test('I should be able to create a new task list', () => alice.createTaskList("My Example List"))
  });

  describe('As a user with a task list already created', () => {
    const listName = "My Initial Tasks"

    beforeEach(() => alice.createTaskList(listName));

    test('I should be able to add new tasks to the list', () => alice.createTask(listName, "Clone the repo"))
  });


  describe('As a user with some data in the task list then', () => {
    test('I should be able to reset my storage', () => alice.profile.resetStorage())
    test('I should be prompted to create my profile', () => alice.profile.checkCreationIsPrompted())

    test('I should be able to create my profile', () =>
      alice.profile.create('Alice 2')
        .then(() => alice.checkAppIsLoaded())
    )

  });


  describe('As a user with a profile already created then', () => {
    test('I should be able to create a new task list', () => alice.createTaskList("My Example List"))
  });

  describe('As a user with a task list already created', () => {
    const listName = "My Initial Tasks"

    beforeEach(() => alice.createTaskList(listName));

    test('I should be able to add new tasks to the list', () => alice.createTask(listName, "Clone the repo"))
  });


  describe('As a user with some data in the task list then', () => {
    test('I should be able to reset my storage', () => alice.profile.resetStorage())
    test('I should be prompted to create my profile', () => alice.profile.checkCreationIsPrompted())

    test('I should be able to create my profile', () =>
      alice.profile.create('Alice 3')
        .then(() => alice.checkAppIsLoaded())
    )

  });

  describe('As a user with a profile already created then', () => {
    test('I should be able to create a new task list', () => alice.createTaskList("My Example List"))
  });

  describe('As a user with a task list already created', () => {
    const listName = "My Initial Tasks"

    beforeEach(() => alice.createTaskList(listName));

    test('I should be able to add new tasks to the list', () => alice.createTask(listName, "Clone the repo"))
  });

  describe('As a user with some data in the task list then', () => {
    test('I should be able to reset my storage', () => alice.profile.resetStorage())
    test('I should be prompted to create my profile', () => alice.profile.checkCreationIsPrompted())

    test('I should be able to create my profile', () =>
      alice.profile.create('Alice 4')
        .then(() => alice.checkAppIsLoaded())
    )

  });


  
});

