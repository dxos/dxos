//
// Copyright 2024 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Client, PublicKey } from '@dxos/client';
import { live, createDocAccessor, Expando, Filter, makeRef, type Space, toCursorRange } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { MigrationBuilder } from '@dxos/migrations';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { DiagramType } from '@dxos/plugin-sketch/types';
import { CollectionType, ChannelType, ThreadType } from '@dxos/plugin-space/types';
import { TableType } from '@dxos/react-ui-table/types';
import { MessageType } from '@dxos/schema';
import { setDeep } from '@dxos/util';

import * as LegacyTypes from './legacy-types';
import { __COMPOSER_MIGRATIONS__ } from './migrations';

const testBuilder = new TestBuilder();

describe('Composer migrations', () => {
  let client: Client;
  let space: Space;

  beforeEach(async () => {
    client = new Client({
      services: testBuilder.createLocalClientServices(),
      types: [
        LegacyTypes.DocumentType,
        LegacyTypes.FileType,
        LegacyTypes.FolderType,
        LegacyTypes.MessageType,
        LegacyTypes.SectionType,
        LegacyTypes.SketchType,
        LegacyTypes.StackType,
        LegacyTypes.TableType,
        LegacyTypes.TextType,
        LegacyTypes.ThreadType,
        ChannelType,
        CollectionType,
        DocumentType,
        MessageType,
        DiagramType,
        TableType,
        ThreadType,
      ],
    });

    await client.initialize();
    await client.halo.createIdentity();
    await client.spaces.waitUntilReady();
    space = client.spaces.default;
  });

  afterEach(async () => {
    await client.destroy();
  });

  test(__COMPOSER_MIGRATIONS__[0].version.toString(), async () => {
    const doc1 = space.db.add(
      live(LegacyTypes.DocumentType, {
        content: makeRef(live(LegacyTypes.TextType, { content: 'object1' })),
        comments: [],
      }),
    );
    const thread1 = space.db.add(
      live(LegacyTypes.ThreadType, {
        messages: [
          makeRef(
            live(LegacyTypes.MessageType, {
              from: { identityKey: PublicKey.random().toHex() },
              blocks: [
                {
                  timestamp: new Date().toISOString(),
                  content: makeRef(live(LegacyTypes.TextType, { content: 'comment1' })),
                },
              ],
            }),
          ),
        ],
      }),
    );
    doc1.comments?.push({
      cursor: toCursorRange(createDocAccessor(doc1.content!.target!, ['content']), 0, 3),
      thread: makeRef(thread1),
    });
    expect(doc1.comments![0].thread!.target instanceof LegacyTypes.ThreadType).to.be.true;

    const folder1 = space.db.add(
      live(LegacyTypes.FolderType, {
        name: 'folder1',
        objects: [
          makeRef(
            live(LegacyTypes.FolderType, {
              name: 'folder2',
              objects: [
                makeRef(live(LegacyTypes.FolderType, { name: 'folder3', objects: [] })),
                makeRef(
                  live(LegacyTypes.StackType, {
                    title: 'stack1',
                    sections: [
                      makeRef(live(LegacyTypes.SectionType, { object: makeRef(doc1) })),
                      makeRef(live(LegacyTypes.SectionType, { object: makeRef(live(Expando, { key: 'object2' })) })),
                    ],
                  }),
                ),
              ],
            }),
          ),
        ],
      }),
    );
    expect(doc1.comments![0].thread?.target instanceof LegacyTypes.ThreadType).to.be.true;
    setDeep(space.properties, LegacyTypes.FolderType.typename.split('.'), makeRef(folder1));

    const folderQuery = space.db.query(Filter.schema(LegacyTypes.FolderType));
    const stackQuery = space.db.query(Filter.schema(LegacyTypes.StackType));
    const collectionQuery = space.db.query(Filter.schema(CollectionType));
    expect((await folderQuery.run()).objects).to.have.lengthOf(3);
    expect((await stackQuery.run()).objects).to.have.lengthOf(1);
    expect((await collectionQuery.run()).objects).to.have.lengthOf(0);

    const builder = new MigrationBuilder(space);
    await __COMPOSER_MIGRATIONS__[0].next({ space, builder });
    await (builder as any)._commit();

    expect((await folderQuery.run()).objects).to.have.lengthOf(0);
    expect((await stackQuery.run()).objects).to.have.lengthOf(0);
    expect((await collectionQuery.run()).objects).to.have.lengthOf(4);

    const rootCollection = space.properties[CollectionType.typename].target as CollectionType;
    expect(rootCollection instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0].target instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0].target?.objects[0].target instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0].target?.objects[1].target instanceof CollectionType).to.be.true;
    expect(rootCollection.objects[0].target?.objects[1].target?.objects).to.have.lengthOf(2);
    expect(rootCollection.objects[0].target?.objects[1].target?.objects[0].target instanceof LegacyTypes.DocumentType)
      .to.be.true;
    expect(
      rootCollection.objects[0].target?.objects[1].target?.objects[0].target?.comments?.[0].thread?.target instanceof
        LegacyTypes.ThreadType,
    ).to.be.true;
  });

  test(__COMPOSER_MIGRATIONS__[1].version.toString(), async () => {
    const doc1 = space.db.add(
      live(LegacyTypes.DocumentType, {
        content: makeRef(live(LegacyTypes.TextType, { content: 'object1' })),
        comments: [],
      }),
    );
    const thread1 = space.db.add(
      live(LegacyTypes.ThreadType, {
        messages: [
          makeRef(
            live(LegacyTypes.MessageType, {
              from: { identityKey: PublicKey.random().toHex() },
              blocks: [
                {
                  timestamp: new Date().toISOString(),
                  content: makeRef(live(LegacyTypes.TextType, { content: 'comment1' })),
                },
              ],
            }),
          ),
        ],
      }),
    );
    const cursor = toCursorRange(createDocAccessor(doc1.content!.target!, ['content']), 0, 3);
    doc1.comments?.push({ cursor, thread: makeRef(thread1) });
    expect(doc1.comments![0].thread?.target instanceof LegacyTypes.ThreadType).to.be.true;
    const sketch1 = space.db.add(
      live(LegacyTypes.SketchType, {
        title: 'My Sketch',
        data: makeRef(live(Expando, { content: { id: 'test string' } })),
      }),
    );
    // TODO(wittjosiah): Include dynamic schema.
    const table1 = space.db.add(
      live(LegacyTypes.TableType, {
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
    await __COMPOSER_MIGRATIONS__[1].next({ space, builder });
    await (builder as any)._commit();

    const migratedDoc1 = space.db.getObjectById<DocumentType>(doc1.id);
    expect(isInstanceOf(DocumentType, migratedDoc1)).to.be.true;
    expect(migratedDoc1?.threads?.[0].target instanceof ThreadType).to.be.true;
    expect(migratedDoc1?.threads?.[0].target?.id).to.equal(thread1.id);
    expect(migratedDoc1?.threads?.[0].target?.anchor).to.equal(cursor);
    expect(migratedDoc1?.threads?.[0].target?.messages?.[0]?.target instanceof MessageType).to.be.true;
    const block = migratedDoc1?.threads?.[0].target?.messages?.[0]?.target?.blocks?.[0];
    expect(block?.type).to.equal('text');
    invariant(block?.type === 'text', 'Block is a text block');
    expect(block?.text).to.equal('comment1');

    const migratedSketch1 = space.db.getObjectById<DiagramType>(sketch1.id);
    expect(migratedSketch1 instanceof DiagramType).to.be.true;
    expect(migratedSketch1?.name).to.equal('My Sketch');
    // TODO(dmaretskyi): Broke with references API update.
    // expect(migratedSketch1?.canvas.target?.schema).to.equal(TLDRAW_SCHEMA);
    expect(migratedSketch1?.canvas.target?.content?.id).to.equal('test string');

    const migratedTable1 = space.db.getObjectById<TableType>(table1.id);
    expect(isInstanceOf(TableType, migratedTable1)).to.be.true;
    expect(migratedTable1?.name).to.equal('My Table');
  });
});
