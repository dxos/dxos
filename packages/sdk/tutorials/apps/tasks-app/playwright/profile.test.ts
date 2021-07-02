//
// Copyright 2021 DXOS.org
//

import { firefox } from 'playwright';

import { Browser, TaskApp } from './utils';

describe('Profile Test Cases', () => {
  const initialUrl = 'http://localhost:3000/';
  let alice: TaskApp;

  beforeAll(() => {
    alice = new TaskApp(new Browser());

    return alice.browser.launch(firefox, initialUrl);
  });

  afterAll(() => alice.browser.get().close());

  describe('As a new user starting the app then', () => {
    test('I should be prompted to create my profile', () => alice.profile.checkCreationIsPrompted())

    test('I should be able to create my profile', () =>
      alice.profile.create('Alice')
        .then(() => alice.checkAppIsLoaded())
    )
  });
});
