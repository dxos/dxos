//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Chat } from '@dxos/assistant-toolkit';
import { Instructions, Project } from '@dxos/compute';
import { Collection, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

/**
 * Deleting a project must take its owned graph with it. The navtree's ⋮ Delete resolves to
 * `SpaceOperation.RemoveObjects`, which splices the project out of its collection and calls
 * `db.remove` — everything else here rides on the ECHO parent edge, so this pins that the edges the
 * create/chat flows establish are the ones the cascade actually follows.
 */
describe('deleting a project', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [Project.Project, Instructions.Instructions, Collection.Collection, Chat.Chat, Feed.Feed, Text.Text],
    });

    // Mirrors the create-object capability: owned instructions + owned artifacts collection.
    const project = db.add(Project.make({ name: 'Test' }));
    const instructions = Instructions.make({ name: 'Instructions', text: 'Focus on this project.' });
    Obj.setParent(instructions, project);
    const artifacts = Collection.make();
    Obj.setParent(artifacts, project);
    Obj.update(project, (project) => {
      project.instructions = Ref.make(instructions);
      project.artifacts = Ref.make(artifacts);
    });

    // Mirrors ProjectOperation.CreateChat: the chat is owned by the parent edge, not a ref field.
    const feed = db.add(Feed.make());
    const chat = db.add(Chat.make({ name: 'Chat', feed: Ref.make(feed) }));
    Obj.setParent(chat, project);
    await db.flush();

    return { db, project, instructions, artifacts, chat };
  };

  type TestDatabase = Awaited<ReturnType<typeof setup>>['db'];

  const countOf = async (db: TestDatabase, filter: Parameters<typeof Query.select>[0]) =>
    (await db.query(Query.select(filter)).run()).length;

  /** Transitive owned descendants, walked the way `SpaceOperation.RemoveObjects` walks them. */
  const collectDescendantIds = async (db: TestDatabase, root: Obj.Unknown) => {
    const visited = new Set([root.id]);
    const descendants: string[] = [];
    let frontier = [root];
    while (frontier.length > 0) {
      const next: Obj.Unknown[] = [];
      for (const object of frontier) {
        const children = await db.query(Query.select(Filter.id(object.id)).children()).run();
        for (const child of children) {
          if (Obj.isObject(child) && !visited.has(child.id)) {
            visited.add(child.id);
            descendants.push(child.id);
            next.push(child);
          }
        }
      }
      frontier = next;
    }

    return descendants;
  };

  test('the owned instructions, artifacts collection and chats are removed with it', async ({ expect }) => {
    const { db, project } = await setup();
    expect(await countOf(db, Filter.type(Project.Project))).toEqual(1);
    expect(await countOf(db, Filter.type(Instructions.Instructions))).toEqual(1);
    expect(await countOf(db, Filter.type(Collection.Collection))).toEqual(1);
    expect(await countOf(db, Filter.type(Chat.Chat))).toEqual(1);

    db.remove(project);
    await db.flush();

    expect(await countOf(db, Filter.type(Project.Project))).toEqual(0);
    expect(await countOf(db, Filter.type(Instructions.Instructions))).toEqual(0);
    expect(await countOf(db, Filter.type(Collection.Collection))).toEqual(0);
    expect(await countOf(db, Filter.type(Chat.Chat))).toEqual(0);
  });

  test('owned descendants are reachable transitively before removal, so their planks can be closed', async ({
    expect,
  }) => {
    const { db, project, chat, instructions, artifacts } = await setup();

    // Mirrors the walk `RemoveObjects` runs to decide which planks to close. Passing only the project
    // would leave the chat's plank open on a removed object; stopping at one level would miss the
    // Text body that `Instructions.make` parents to the instructions.
    const descendantIds = await collectDescendantIds(db, project);
    expect(descendantIds).toContain(chat.id);
    expect(descendantIds).toContain(instructions.id);
    expect(descendantIds).toContain(artifacts.id);

    const textId = instructions.text.target?.id;
    expect(textId).toBeTruthy();
    expect(descendantIds).toContain(textId);
  });

  test('artifacts are NOT removed with it — they are referenced, not owned', async ({ expect }) => {
    const { db, project, artifacts } = await setup();
    // An artifact is filed into the collection by ref; its parent stays wherever it was created.
    const artifact = db.add(Feed.make());
    Obj.update(artifacts, (artifacts) => {
      artifacts.objects.push(Ref.make(artifact));
    });
    await db.flush();

    db.remove(project);
    await db.flush();

    const remaining = await db.query(Query.select(Filter.type(Feed.Feed))).run();
    expect(remaining.map((object) => object.id)).toContain(artifact.id);
  });
});
