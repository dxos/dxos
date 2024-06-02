//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import {
  Collection,
  DocumentType,
  MessageType,
  TextV0Type,
  ThreadType,
  getSpaceProperty,
  setSpaceProperty,
} from '@braneframe/types';
import { Client, PublicKey } from '@dxos/client';
import { type Space, Filter, toCursorRange, createDocAccessor } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { create, Expando } from '@dxos/echo-schema';
import { afterEach, beforeEach, describe, test } from '@dxos/test';

import { FolderType, SectionType, StackType, migrations } from './migrations';

const testBuilder = new TestBuilder();

describe('Composer migrations', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    client.addSchema(
      FolderType,
      Expando,
      SectionType,
      StackType,
      Collection,
      DocumentType,
      TextV0Type,
      ThreadType,
      MessageType,
    );
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    space = client.spaces.default;
  });

  afterEach(async () => {
    await client.destroy();
  });

  test(migrations[0].version.toString(), async () => {
    const query = space.db.query(Filter.schema(FolderType));
    expect((await query.run({ timeout: 100 })).objects).to.have.lengthOf(0);

    await migrations[0].up({ space });
    const afterMigration = await query.run();
    expect(afterMigration.objects).to.have.lengthOf(1);
    expect(afterMigration.objects[0].name).to.equal(space.key.toHex());
    expect(getSpaceProperty(space, FolderType.typename)).to.equal(afterMigration.objects[0]);
  });

  test(migrations[1].version.toString(), async () => {
    const folder1 = space.db.add(create(FolderType, { name: space.key.toHex(), objects: [] }));
    const folder2 = space.db.add(create(FolderType, { name: space.key.toHex(), objects: [] }));
    const folder3 = space.db.add(create(FolderType, { name: space.key.toHex(), objects: [] }));
    setSpaceProperty(space, FolderType.typename, folder3);

    const keys = [...Array(9)].map(() => PublicKey.random().toHex());
    folder1.objects = keys.slice(0, 3).map((key) => create(Expando, { key }));
    folder2.objects = keys.slice(3, 6).map((key) => create(Expando, { key }));
    folder3.objects = keys.slice(6, 9).map((key) => create(Expando, { key }));

    const query = space.db.query(Filter.schema(FolderType));
    const beforeMigration = await query.run();
    expect(beforeMigration.objects).to.have.lengthOf(3);
    expect(beforeMigration.objects[0].name).to.equal(space.key.toHex());
    expect(beforeMigration.objects[0].objects).to.have.lengthOf(3);

    await migrations[1].up({ space });
    const afterMigration = await query.run();
    expect(afterMigration.objects).to.have.lengthOf(1);
    expect(afterMigration.objects[0].name).to.equal('');
    expect(afterMigration.objects[0].objects).to.have.lengthOf(9);
    expect(getSpaceProperty(space, FolderType.typename)).to.equal(afterMigration.objects[0]);
  });

  test(migrations[2].version.toString(), async () => {
    const doc1 = space.db.add(
      create(DocumentType, {
        content: create(TextV0Type, { content: 'object1' }),
        comments: [],
      }),
    );
    const thread1 = space.db.add(
      create(ThreadType, {
        messages: [
          create(MessageType, {
            from: { identityKey: PublicKey.random().toHex() },
            blocks: [
              // {
              //   timestamp: new Date().toISOString(),
              //   content: create(TextV0Type, { content: 'comment1' }),
              // },
            ],
          }),
        ],
      }),
    );
    doc1.comments?.push({
      cursor: toCursorRange(createDocAccessor(doc1.content!, ['content']), 0, 3),
      thread: thread1,
    });
    expect(doc1.comments![0].thread instanceof ThreadType).to.be.true;

    const folder1 = space.db.add(
      create(FolderType, {
        name: 'folder1',
        objects: [
          create(FolderType, {
            name: 'folder2',
            objects: [
              create(FolderType, { name: 'folder3', objects: [] }),
              create(StackType, {
                title: 'stack1',
                sections: [
                  create(SectionType, { object: doc1 }),
                  create(SectionType, { object: create(Expando, { key: 'object2' }) }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    expect(doc1.comments![0].thread instanceof ThreadType).to.be.true;
    setSpaceProperty(space, FolderType.typename, folder1);

    const folderQuery = space.db.query(Filter.schema(FolderType));
    const stackQuery = space.db.query(Filter.schema(StackType));
    expect((await folderQuery.run()).objects).to.have.lengthOf(3);
    expect((await stackQuery.run()).objects).to.have.lengthOf(1);

    await migrations[2].up({ space });

    const collectionQuery = space.db.query(Filter.schema(Collection));
    expect((await collectionQuery.run()).objects).to.have.lengthOf(4);
    const rootCollection = space.properties[Collection.typename] as Collection;
    expect(rootCollection instanceof Collection).to.be.true;
    expect(rootCollection.objects[0] instanceof Collection).to.be.true;
    expect(rootCollection.objects[0]?.objects[0] instanceof Collection).to.be.true;
    expect(rootCollection.objects[0]?.objects[1] instanceof Collection).to.be.true;
    expect(rootCollection.objects[0]?.objects[1]?.objects).to.have.lengthOf(2);
    expect(rootCollection.objects[0]?.objects[1]?.objects[0] instanceof DocumentType).to.be.true;
    expect(rootCollection.objects[0]?.objects[1]?.objects[0]?.comments?.[0].thread instanceof ThreadType).to.be.true;
  });
});
