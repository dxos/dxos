//
// Copyright 2023 DXOS.org
//

import { test } from '@playwright/test';
import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { faker } from '@dxos/random';

import { AppManager } from './app-manager';
import { Markdown, Thread } from './plugins';

faker.seed(0);

// NOTE: Reduce flakiness in CI by using waitForExpect.
test.describe('Comments tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    host = new AppManager(browser, true);
    await host.init();
  });

  test.afterEach(async () => {
    await host.closePage();
  });

  test('create', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;

    const editorTextBox = Markdown.getMarkdownTextboxWithLocator(editorPlank);

    await editorTextBox.fill('Hello wold!');
    await Markdown.select(editorTextBox, 'wold');
    await Thread.createComment(host.page, editorPlank, 'world');
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(1);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
    });
  });

  test('edit message', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;
    const editorTextBox = Markdown.getMarkdownTextboxWithLocator(editorPlank);

    const editorText = 'Hello world!';
    const messageText = 'Example';
    await editorTextBox.fill(editorText);
    await Markdown.select(editorTextBox, editorText);
    await Thread.createComment(host.page, editorPlank, messageText);
    const thread = Thread.getThread(host.page, editorText);
    const message = Thread.getMessage(thread, messageText).getByRole('textbox');
    await waitForExpect(async () => {
      expect((await message.innerText()).trim()).to.equal(messageText);
    });

    const editedText = 'Edited';
    await message.fill('');
    await message.fill(editedText);
    const editedMessage = Thread.getMessage(thread, editedText).getByRole('textbox');
    await waitForExpect(async () => {
      expect((await editedMessage.innerText()).trim()).to.equal(editedText);
    });
  });

  test('delete message', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;
    const editorTextBox = Markdown.getMarkdownTextboxWithLocator(editorPlank);

    const editorText = faker.lorem.paragraph();
    await editorTextBox.fill(editorText);
    await Markdown.select(editorTextBox, editorText);
    const firstMessage = faker.lorem.sentence();
    await Thread.createComment(host.page, editorPlank, firstMessage);
    const thread = Thread.getThread(host.page, editorText);
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(1);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
      expect(await Thread.getMessages(thread).count()).to.equal(2);
    });

    // Add a second message to the thread.
    const secondMessage = faker.lorem.sentence();
    await Thread.addMessage(thread, secondMessage);
    await waitForExpect(async () => {
      expect(await Thread.getMessages(thread).count()).to.equal(3);
    });

    // Delete the second message.
    await Thread.deleteMessage(Thread.getMessage(thread, secondMessage));
    await waitForExpect(async () => {
      expect(await Thread.getMessages(thread).count()).to.equal(2);
    });

    // Deleting last message should delete the thread.
    await Thread.deleteMessage(Thread.getMessage(thread, firstMessage));
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(0);
      expect(await Thread.getThreads(host.page).count()).to.equal(0);
    });
  });

  test('delete thread', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;
    const editorTextBox = Markdown.getMarkdownTextboxWithLocator(editorPlank);
    const editorText = faker.lorem.paragraph();
    await editorTextBox.fill(editorText);
    await Markdown.select(editorTextBox, editorText);
    const firstMessage = faker.lorem.sentence();
    await Thread.createComment(host.page, editorPlank, firstMessage);
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(1);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
    });

    const thread = Thread.getThread(host.page, editorText);
    await Thread.deleteThread(thread);
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(0);
      expect(await Thread.getThreads(host.page).count()).to.equal(0);
    });
  });

  test('undo delete thread', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');
    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(editorPlank);
    const editorText = faker.lorem.paragraph();
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, editorText);
    const firstMessage = faker.lorem.sentence();
    await Thread.createComment(host.page, editorPlank, firstMessage);
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(1);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
    });

    const thread = Thread.getThread(host.page, editorText);
    await Thread.deleteThread(thread);
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(0);
      expect(await Thread.getThreads(host.page).count()).to.equal(0);
    });

    // Undo delete.
    await host.toastAction();
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(1);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
    });
  });

  test('selecting comment highlights thread and vice versa', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;
    const editorTextbox = Markdown.getMarkdownTextboxWithLocator(editorPlank);

    const editorText = faker.lorem.paragraphs(3);
    const firstMessage = editorText.slice(0, 10);
    const secondMessage = editorText.slice(100, 115);
    const thirdMessage = editorText.slice(-20);
    await editorTextbox.fill(editorText);
    await Markdown.select(editorTextbox, firstMessage);
    await Thread.createComment(host.page, editorPlank, faker.lorem.sentence());
    await Markdown.select(editorTextbox, secondMessage);
    await Thread.createComment(host.page, editorPlank, faker.lorem.sentence());
    await Markdown.select(editorTextbox, thirdMessage);
    await Thread.createComment(host.page, editorPlank, faker.lorem.sentence());
    await waitForExpect(async () => {
      expect(await Thread.getComment(host.page, thirdMessage).getAttribute('class')).to.equal('cm-comment-current');
      expect(await Thread.getThread(host.page, thirdMessage).getAttribute('aria-current')).to.equal('location');
    });

    // Selecting a comment should highlight the thread.
    await Thread.getComment(host.page, firstMessage).click();
    await waitForExpect(async () => {
      expect(await Thread.getComment(host.page, firstMessage).getAttribute('class')).to.equal('cm-comment-current');
      expect(await Thread.getThread(host.page, firstMessage).getAttribute('aria-current')).to.equal('location');
    });

    // Selecting a thread should highlight the comment.
    await Thread.getThread(host.page, secondMessage).click();
    await waitForExpect(async () => {
      expect(await Thread.getComment(host.page, secondMessage).getAttribute('class')).to.equal('cm-comment-current');
      expect(await Thread.getThread(host.page, secondMessage).getAttribute('aria-current')).to.equal('location');
    });
  });

  // TODO(wittjosiah): Paste doesn't work in headless mode.
  test.skip('cut & paste comment', async () => {
    await host.createSpace();
    await host.createObject('markdownPlugin');

    const editorPlank = (await host.planks.getPlanks({ filter: 'markdown' }))[0].locator;
    const editorTextBox = Markdown.getMarkdownTextboxWithLocator(editorPlank);

    const editorText = faker.lorem.paragraphs(3);
    const messageText = editorText.slice(10, 20);
    await editorTextBox.fill(editorText);
    await Markdown.select(editorTextBox, messageText);
    await Thread.createComment(host.page, editorPlank, faker.lorem.sentence());
    await waitForExpect(async () => {
      expect(await Thread.getComment(host.page, messageText).getAttribute('class')).to.equal('cm-comment-current');
      expect(await Thread.getThread(host.page, messageText).getAttribute('aria-current')).to.equal('location');
    });

    await Markdown.getMarkdownTextbox(host.page).focus();
    const cut = editorText.slice(0, 50);
    await Markdown.select(editorTextBox, cut);
    await host.cut();
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(0);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
    });

    await Markdown.getMarkdownTextbox(host.page).focus();
    await host.paste();
    await waitForExpect(async () => {
      expect(await Thread.getComments(host.page).count()).to.equal(1);
      expect(await Thread.getThreads(host.page).count()).to.equal(1);
    });
  });
});
