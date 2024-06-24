//
// Copyright 2024 DXOS.org
//

import type { SerializedStore } from '@tldraw/store';
import type { TLRecord } from '@tldraw/tldraw';

import { Filter, loadObjectReferences } from '@dxos/client/echo';
import { type Migration, type MigrationBuilder, type ObjectStructure } from '@dxos/migrations';
import { getDeep, isNode, nonNullable } from '@dxos/util';

import * as LegacyTypes from './legacy-types';
import {
  CanvasType,
  ChannelType,
  CollectionType,
  DocumentType,
  FileType,
  MessageType,
  SketchType,
  TableType,
  TextType,
  ThreadType,
  TLDRAW_SCHEMA_VERSION,
} from '../schema';

export const __COMPOSER_MIGRATIONS__: Migration[] = [
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
    version: '2024-06-12/fully-qualified-typenames',
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

        // NOTE: Catching errors because some documents may not have comments.
        await loadObjectReferences(
          doc,
          (d) => d.comments?.map((comment) => comment.thread).filter((thread) => !!thread) ?? [],
        ).catch(() => {});
        const threads: ReturnType<MigrationBuilder['createReference']>[] = [];
        for (const comment of doc.comments ?? []) {
          const thread = comment.thread;
          if (!thread) {
            continue;
          }

          const messages = await loadObjectReferences(thread, (t) => t.messages);
          for (const message of messages) {
            // NOTE: Catching errors because some messages may not have block content.
            const { content } = await loadObjectReferences(
              message,
              (m) => m.blocks[0].content ?? { content: '' },
            ).catch(() => ({ content: '' }));
            await builder.migrateObject(message.id, ({ data }) => ({
              schema: MessageType,
              props: {
                sender: data.from ?? space.members.get()[0].identity.identityKey.toHex(),
                timestamp: data.blocks[0].timestamp,
                text: content,
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

      const { objects: sketches } = await space.db.query(Filter.schema(LegacyTypes.SketchType)).run();

      // TODO(wittjosiah): Only attempting to migrate canvas content in the browser due to current esm/testing setup.
      let migrateCanvas = async (records: SerializedStore<TLRecord>) => records;
      if (!isNode()) {
        const { migrateCanvas: migrateCanvasBrowser } = await import('./tldraw');
        migrateCanvas = migrateCanvasBrowser;
      }

      for (const sketch of sketches) {
        const data = await loadObjectReferences(sketch, (s) => s.data);
        await builder.migrateObject(data.id, async ({ data }) => {
          return {
            schema: CanvasType,
            props: {
              content: await migrateCanvas(data.content),
              schema: TLDRAW_SCHEMA_VERSION,
            },
          };
        });

        await builder.migrateObject(sketch.id, ({ data }) => ({
          schema: SketchType,
          props: {
            name: data.title,
            canvas: data.data,
          },
        }));
      }

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
          // NOTE: Catching errors because some messages may not have block content.
          const { content } = await loadObjectReferences(message, (m) => m.blocks[0].content ?? { content: '' }).catch(
            () => ({ content: '' }),
          );
          await builder.migrateObject(message.id, ({ data }) => ({
            schema: MessageType,
            props: {
              sender: data.from ?? space.members.get()[0].identity.identityKey.toHex(),
              timestamp: data.blocks[0].timestamp,
              text: content,
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
