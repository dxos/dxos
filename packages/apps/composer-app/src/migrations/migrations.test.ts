//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { CollectionType, DocumentType, MessageType, TextV0Type, ThreadType } from '@braneframe/types';
import { Client, PublicKey } from '@dxos/client';
import { type Space, Filter, toCursorRange, createDocAccessor, Expando, create } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { MigrationBuilder } from '@dxos/migrations';
import { afterEach, beforeEach, describe, test } from '@dxos/test';
import { assignDeep } from '@dxos/util';

import { FolderType, SectionType, StackType, migrations } from './migrations';

const testBuilder = new TestBuilder();

describe('Composer migrations', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    client.addTypes([
      FolderType,
      Expando,
      SectionType,
      StackType,
      CollectionType,
      DocumentType,
      TextV0Type,
      ThreadType,
      MessageType,
    ]);
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    await client.spaces.default.waitUntilReady();
    space = client.spaces.default;
  });

  afterEach(async () => {
    await client.destroy();
  });

  test(migrations[0].version.toString(), async () => {
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
    assignDeep(space.properties, FolderType.typename.split('.'), folder1);

    const folderQuery = space.db.query(Filter.schema(FolderType));
    const stackQuery = space.db.query(Filter.schema(StackType));
    const collectionQuery = space.db.query(Filter.schema(CollectionType));
    expect((await folderQuery.run()).objects).to.have.lengthOf(3);
    expect((await stackQuery.run()).objects).to.have.lengthOf(1);
    expect((await collectionQuery.run()).objects).to.have.lengthOf(0);

    const builder = new MigrationBuilder(space);
    await migrations[0].next({ space, builder });
    await (builder as any)._commit();

    expect((await folderQuery.run()).objects).to.have.lengthOf(0);
    expect((await stackQuery.run()).objects).to.have.lengthOf(0);
    expect((await collectionQuery.run()).objects).to.have.lengthOf(4);

    const rootCollection = space.properties[CollectionType.typename] as CollectionType;
    expect(rootCollection instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0] instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0]?.objects[0] instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0]?.objects[1] instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0]?.objects[1]?.objects).to.have.lengthOf(2);
    expect(rootCollection.objects[0]?.objects[1]?.objects[0] instanceof DocumentType).to.be.true;
    expect(rootCollection.objects[0]?.objects[1]?.objects[0]?.comments?.[0].thread instanceof ThreadType).to.be.true;
  });
});
