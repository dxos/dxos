//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import {
  ChannelType,
  CollectionType,
  DocumentType,
  FileType,
  MessageType,
  TableType,
  ThreadType,
} from '@braneframe/types';
import { Client, PublicKey } from '@dxos/client';
import { type Space, Filter, toCursorRange, createDocAccessor, Expando, create } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { MigrationBuilder } from '@dxos/migrations';
import { afterEach, beforeEach, describe, test } from '@dxos/test';
import { assignDeep } from '@dxos/util';

import * as LegacyTypes from './legacy-types';
import { migrations } from './migrations';

const testBuilder = new TestBuilder();

describe('Composer migrations', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    client.addTypes([
      LegacyTypes.DocumentType,
      LegacyTypes.FileType,
      LegacyTypes.FolderType,
      LegacyTypes.MessageType,
      LegacyTypes.SectionType,
      LegacyTypes.StackType,
      LegacyTypes.TableType,
      LegacyTypes.TextType,
      LegacyTypes.ThreadType,
      Expando,
      ChannelType,
      CollectionType,
      DocumentType,
      FileType,
      MessageType,
      TableType,
      ThreadType,
    ]);
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    space = client.spaces.default;
  });

  afterEach(async () => {
    await client.destroy();
  });

  test(migrations[0].version.toString(), async () => {
    const doc1 = space.db.add(
      create(LegacyTypes.DocumentType, {
        content: create(LegacyTypes.TextType, { content: 'object1' }),
        comments: [],
      }),
    );
    const thread1 = space.db.add(
      create(LegacyTypes.ThreadType, {
        messages: [
          create(LegacyTypes.MessageType, {
            from: { identityKey: PublicKey.random().toHex() },
            blocks: [
              {
                timestamp: new Date().toISOString(),
                content: create(LegacyTypes.TextType, { content: 'comment1' }),
              },
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
      create(LegacyTypes.FolderType, {
        name: 'folder1',
        objects: [
          create(LegacyTypes.FolderType, {
            name: 'folder2',
            objects: [
              create(LegacyTypes.FolderType, { name: 'folder3', objects: [] }),
              create(LegacyTypes.StackType, {
                title: 'stack1',
                sections: [
                  create(LegacyTypes.SectionType, { object: doc1 }),
                  create(LegacyTypes.SectionType, { object: create(Expando, { key: 'object2' }) }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
    expect(doc1.comments![0].thread instanceof ThreadType).to.be.true;
    assignDeep(space.properties, LegacyTypes.FolderType.typename.split('.'), folder1);

    const folderQuery = space.db.query(Filter.schema(LegacyTypes.FolderType));
    const stackQuery = space.db.query(Filter.schema(LegacyTypes.StackType));
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

  test(migrations[1].version.toString(), async () => {
    const doc1 = space.db.add(
      create(LegacyTypes.DocumentType, {
        content: create(LegacyTypes.TextType, { content: 'object1' }),
        comments: [],
      }),
    );
    const thread1 = space.db.add(
      create(LegacyTypes.ThreadType, {
        messages: [
          create(LegacyTypes.MessageType, {
            from: { identityKey: PublicKey.random().toHex() },
            blocks: [
              {
                timestamp: new Date().toISOString(),
                content: create(LegacyTypes.TextType, { content: 'comment1' }),
              },
            ],
          }),
        ],
      }),
    );
    const thread2 = space.db.add(
      create(LegacyTypes.ThreadType, {
        title: 'My Thread',
        messages: [
          create(LegacyTypes.MessageType, {
            from: { identityKey: PublicKey.random().toHex() },
            blocks: [
              {
                timestamp: new Date().toISOString(),
                content: create(LegacyTypes.TextType, { content: 'hello world' }),
              },
            ],
          }),
        ],
      }),
    );
    const cursor = toCursorRange(createDocAccessor(doc1.content!, ['content']), 0, 3);
    doc1.comments?.push({ cursor, thread: thread1 });
    expect(doc1.comments![0].thread instanceof LegacyTypes.ThreadType).to.be.true;
    const file1 = space.db.add(
      create(LegacyTypes.FileType, { filename: 'file1.jpeg', type: 'image/jpeg', title: 'My File' }),
    );
    // TODO(wittjosiah): Include dynamic schema.
    const table1 = space.db.add(
      create(LegacyTypes.TableType, {
        title: 'My Table',
        props: [
          {
            id: '1',
            prop: 'prop1',
            label: 'Prop 1',
            ref: 'ref1',
            refProp: 'refProp1',
            size: 100,
          },
        ],
      }),
    );

    const builder = new MigrationBuilder(space);
    await migrations[1].next({ space, builder });
    await (builder as any)._commit();

    const migratedDoc1 = space.db.getObjectById<DocumentType>(doc1.id);
    expect(migratedDoc1 instanceof DocumentType).to.be.true;
    expect(migratedDoc1?.threads?.[0] instanceof ThreadType).to.be.true;
    expect(migratedDoc1?.threads?.[0].id).to.equal(thread1.id);
    expect(migratedDoc1?.threads?.[0]?.anchor).to.equal(cursor);
    expect(migratedDoc1?.threads?.[0]?.messages?.[0] instanceof MessageType).to.be.true;
    expect(migratedDoc1?.threads?.[0]?.messages?.[0]?.text).to.equal('comment1');

    const { objects: channels } = await space.db.query(Filter.schema(ChannelType)).run();
    expect(channels).to.have.lengthOf(1);
    const migratedThread2 = channels[0]?.threads[0];
    expect(migratedThread2 instanceof ThreadType).to.be.true;
    expect(migratedThread2?.id).to.equal(thread2.id);
    expect(migratedThread2?.name).to.equal('My Thread');
    expect(migratedThread2?.messages?.[0] instanceof MessageType).to.be.true;
    expect(migratedThread2?.messages?.[0]?.text).to.equal('hello world');

    const migratedFile1 = space.db.getObjectById<FileType>(file1.id);
    expect(migratedFile1 instanceof FileType).to.be.true;
    expect(migratedFile1?.filename).to.equal('file1.jpeg');
    expect(migratedFile1?.type).to.equal('image/jpeg');
    expect(migratedFile1?.name).to.equal('My File');

    const migratedTable1 = space.db.getObjectById<TableType>(table1.id);
    expect(migratedTable1 instanceof TableType).to.be.true;
    expect(migratedTable1?.name).to.equal('My Table');
    expect(migratedTable1?.props).to.have.lengthOf(1);
  });
});
