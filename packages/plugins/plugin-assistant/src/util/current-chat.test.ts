//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import { Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { currentChatRef } from './current-chat.ts';

describe('currentChatRef', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('resolves the chat from the URI SetCurrentChat stores', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Chat.Chat, Project.Project, Feed.Feed] });
    const subject = db.add(Project.make({ name: 'Project' }));
    const chat = db.add(Chat.make({ name: 'Delegated', feed: Ref.make(db.add(Feed.make())) }));

    const ref = currentChatRef(subject, Obj.getURI(chat));
    expect(ref?.target?.id).toEqual(chat.id);
  });

  test('resolves nothing without a stored URI', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Project.Project] });
    const subject = db.add(Project.make({ name: 'Project' }));

    expect(currentChatRef(subject, undefined)).toBeUndefined();
    expect(currentChatRef(subject, 'not a uri')).toBeUndefined();
  });
});
