//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Session from '@dxos/assistant/Session';
import * as Project from '@dxos/compute/Project';
import { Annotation, Feed, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { ArchivedAnnotation } from '@dxos/schema';

describe('chats section query', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('excludes companion chats and project chats, keeping standalone ones', async ({ expect }) => {
    const { db } = await builder.createDatabase({
      types: [Session.Session, Project.Project, Feed.Feed],
    });

    const makeChat = (name: string) => db.add(Session.make({ name, feed: Ref.make(db.add(Feed.make())) }));

    const standalone = makeChat('Standalone');

    const companionSubject = db.add(Project.make({ name: 'Subject' }));
    const companion = makeChat('Companion');
    Session.linkCompanion({ chat: companion, subject: companionSubject });

    const project = db.add(Project.make({ name: 'Project' }));
    const projectChat = makeChat('Project chat');
    Session.linkCompanion({ chat: projectChat, subject: project });

    await db.flush({ indexes: true });

    const results = await db.query(TypeSection.sectionQuery(Session.Session)).run();
    expect(results.map((chat) => chat.id)).toEqual([standalone.id]);
    expect(results.map((chat) => chat.id)).not.toContain(companion.id);
    expect(results.map((chat) => chat.id)).not.toContain(projectChat.id);
  });

  test('excludes archived chats', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Session.Session, Feed.Feed] });
    const makeChat = (name: string) => db.add(Session.make({ name, feed: Ref.make(db.add(Feed.make())) }));

    const active = makeChat('Active');
    const archived = makeChat('Archived');
    Obj.update(archived, (archived) => Annotation.set(archived, ArchivedAnnotation, true));
    await db.flush({ indexes: true });

    const results = await db.query(TypeSection.sectionQuery(Session.Session)).run();
    expect(results.map((chat) => chat.id)).toEqual([active.id]);

    Obj.update(archived, (archived) => Annotation.set(archived, ArchivedAnnotation, false));
    await db.flush({ indexes: true });

    const restored = await db.query(TypeSection.sectionQuery(Session.Session)).run();
    expect(restored.map((chat) => chat.id).sort()).toEqual([active.id, archived.id].sort());
  });
});
