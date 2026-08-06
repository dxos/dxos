//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Chat } from '@dxos/assistant-toolkit';
import * as Project from '@dxos/compute/Project';
import { Feed, Obj, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { standaloneChatsQuery } from './app-graph-builder';

describe('standalone chats query', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('excludes companion chats and project chats, keeping standalone ones', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Chat.Chat, Chat.CompanionTo, Project.Project, Feed.Feed],
    });

    const makeChat = (name: string) => db.add(Chat.make({ name, feed: Ref.make(db.add(Feed.make())) }));

    const standalone = makeChat('Standalone');

    // Companion: sources a CompanionTo relation, so it belongs to its primary object's panel.
    const companionSubject = db.add(Project.make({ name: 'Subject' }));
    const companion = makeChat('Companion');
    db.add(Relation.make(Chat.CompanionTo, { [Relation.Source]: companion, [Relation.Target]: companionSubject }));

    // Project chat: parented to a project, so it is that project's navtree child.
    const project = db.add(Project.make({ name: 'Project' }));
    const projectChat = makeChat('Project chat');
    Obj.setParent(projectChat, project);

    await db.flush({ indexes: true });

    const results = await db.query(standaloneChatsQuery).run();
    expect(results.map((chat) => chat.id)).toEqual([standalone.id]);
    expect(results.map((chat) => chat.id)).not.toContain(companion.id);
    expect(results.map((chat) => chat.id)).not.toContain(projectChat.id);
  });
});
