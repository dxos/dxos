//
// Copyright 2024 DXOS.org
//

import {
  ChannelType,
  CollectionType,
  DocumentType,
  FileType,
  MessageType,
  TableType,
  TextType,
  ThreadType,
} from '@braneframe/types';
import { loadObjectReferences } from '@dxos/echo-db';
import { type MigrationBuilder, type Migration, type ObjectStructure } from '@dxos/migrations';
import { Filter } from '@dxos/react-client/echo';
import { getDeep, nonNullable } from '@dxos/util';

import * as LegacyTypes from './legacy-types';

export const migrations: Migration[] = [
  {
    version: '2024-06-10-collections',
    next: async ({ space, builder }) => {
      const { objects: folders } = await space.db.query(Filter.schema(LegacyTypes.FolderType)).run();
      const { objects: stacks } = await space.db.query(Filter.schema(LegacyTypes.StackType)).run();
      const { objects: collections } = await space.db.query(Filter.schema(CollectionType)).run();

      // Delete any existing collections from failed migrations.
      for (const collection of collections) {
        builder.deleteObject(collection.id);
      }

      // Migrate folders to collections.
      for (const folder of folders) {
        await builder.migrateObject(folder.id, ({ data }) => ({
          schema: CollectionType,
          props: {
            name: data.name,
            objects: data.objects,
            views: {},
          },
        }));
      }

      // Migrate stacks to collections.
      for (const stack of stacks) {
        const sections = await loadObjectReferences(stack, (s) => s.sections);
        const sectionStructures: ObjectStructure[] = [];
        for (const section of sections) {
          builder.deleteObject(section.id);

          const object = await builder.findObject(section.id);
          if (object) {
            sectionStructures.push(object);
          }
        }

        await builder.migrateObject(stack.id, ({ data }) => {
          return {
            schema: CollectionType,
            props: {
              name: data.title,
              objects: sectionStructures.map((section) => section.data.object),
              views: {},
            },
          };
        });
      }

      // Update root folder reference to collection.
      builder.changeProperties((propertiesStructure) => {
        // `getDeep` because the root folder property used to be nested.
        const prevRootFolder = getDeep(propertiesStructure.data, LegacyTypes.FolderType.typename.split('.'));
        propertiesStructure.data[CollectionType.typename] = prevRootFolder ? { ...prevRootFolder } : null;
      });
    },
  },
  {
    version: '2024-06-12-fully-qualified-typenames',
    next: async ({ space, builder }) => {
      //
      // Documents
      //

      const { objects: docs } = await space.db.query(Filter.schema(LegacyTypes.DocumentType)).run();

      for (const doc of docs) {
        const content = await loadObjectReferences(doc, (d) => d.content);
        await builder.migrateObject(content.id, ({ data }) => ({
          schema: TextType,
          props: {
            content: data.content,
          },
        }));

        await loadObjectReferences(doc, (d) => d.comments?.map((comment) => comment.thread));
        const threads: ReturnType<MigrationBuilder['createReference']>[] = [];
        for (const comment of doc.comments ?? []) {
          const thread = comment.thread;
          if (!thread) {
            continue;
          }

          const messages = await loadObjectReferences(thread, (t) => t.messages);
          for (const message of messages) {
            const { content } = (await loadObjectReferences(message, (m) => m.blocks[0].content)) ?? { content: '' };
            await builder.migrateObject(message.id, ({ data }) => ({
              schema: MessageType,
              props: {
                from: data.from ?? space.members.get()[0].identity.identityKey.toHex(),
                date: data.blocks[0].timestamp,
                content,
              },
            }));
          }

          await builder.migrateObject(thread.id, ({ data }) => ({
            schema: ThreadType,
            props: {
              name: data.title,
              anchor: comment.cursor,
              messages: data.messages,
            },
          }));
          threads.push(builder.createReference(thread.id));
        }

        await builder.migrateObject(doc.id, ({ data }) => ({
          schema: DocumentType,
          props: {
            name: data.title,
            content: data.content,
            threads,
          },
        }));
      }

      //
      // Files
      //

      const { objects: files } = await space.db.query(Filter.schema(LegacyTypes.FileType)).run();

      for (const file of files) {
        await builder.migrateObject(file.id, ({ data }) => ({
          schema: FileType,
          props: {
            filename: data.filename,
            type: data.type,
            timestamp: data.timestamp,
            name: data.title,
            cid: data.cid,
          },
        }));
      }

      //
      // Sketches
      //

      // TODO

      //
      // Tables
      //

      const { objects: tables } = await space.db.query(Filter.schema(LegacyTypes.TableType)).run();

      for (const table of tables) {
        await builder.migrateObject(table.id, ({ data }) => ({
          schema: TableType,
          props: {
            name: data.title,
            schema: data.schema,
            props: data.props,
          },
        }));
      }

      //
      // Threads
      //

      const { objects: threads } = await space.db.query(Filter.schema(LegacyTypes.ThreadType)).run();
      const documentThreads = docs
        .flatMap((doc) => doc.comments?.map((comment) => comment.thread?.id))
        .filter(nonNullable);
      const standaloneThreads = threads.filter((thread) => !documentThreads.includes(thread.id));

      for (const thread of standaloneThreads) {
        const messages = await loadObjectReferences(thread, (t) => t.messages);
        for (const message of messages) {
          const { content } = (await loadObjectReferences(message, (m) => m.blocks[0].content)) ?? { content: '' };
          await builder.migrateObject(message.id, ({ data }) => ({
            schema: MessageType,
            props: {
              from: data.from ?? space.members.get()[0].identity.identityKey.toHex(),
              date: data.blocks[0].timestamp,
              content,
            },
          }));
        }

        await builder.migrateObject(thread.id, ({ data }) => ({
          schema: ThreadType,
          props: {
            name: data.title,
            anchor: undefined,
            messages: data.messages,
          },
        }));

        const threadRef = builder.createReference(thread.id);

        await builder.addObject(ChannelType, { name: thread.title, threads: [threadRef] });
      }
    },
  },
];
