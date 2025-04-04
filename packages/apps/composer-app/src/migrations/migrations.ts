//
// Copyright 2024 DXOS.org
//

// import type { SerializedStore } from '@tldraw/store';
// import type { TLRecord } from '@tldraw/tldraw';

import { Filter, RefArray } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { type Migration, type MigrationBuilder, type ObjectStructure } from '@dxos/migrations';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { type MigrateCanvas } from '@dxos/plugin-sketch/sdk';
import { DiagramType, CanvasType, TLDRAW_SCHEMA } from '@dxos/plugin-sketch/types';
import { CollectionType, ThreadType } from '@dxos/plugin-space/types';
import { TableType } from '@dxos/react-ui-table/types';
import { TextType, MessageType } from '@dxos/schema';
import { getDeep, isNode, isNonNullable } from '@dxos/util';

import * as LegacyTypes from './legacy-types';

export const __COMPOSER_MIGRATIONS__: Migration[] = [
  {
    version: '2024-06-10-collections',
    next: async ({ space, builder }) => {
      const { objects: folders } = await space.db.query(Filter.schema(LegacyTypes.FolderType)).run();
      const { objects: stacks } = await space.db.query(Filter.schema(LegacyTypes.StackType)).run();
      const { objects: sections } = await space.db.query(Filter.schema(LegacyTypes.SectionType)).run();
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
            name: data.name ?? data.title,
            objects: data.objects,
            views: {},
          },
        }));
      }

      // Migrate stacks to collections.
      for (const stack of stacks) {
        const sections = await RefArray.loadAll(stack.sections);
        const sectionStructures: ObjectStructure[] = [];
        for (const section of sections) {
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

      // Delete sections.
      for (const section of sections) {
        builder.deleteObject(section.id);
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
        const content = await doc.content.load();
        await builder.migrateObject(content.id, ({ data }) => ({
          schema: TextType,
          props: {
            content: data.content,
          },
        }));

        // NOTE: Catching errors because some documents may not have comments.
        await RefArray.loadAll(doc.comments?.map((comment) => comment.thread).filter(isNonNullable) ?? []).catch(
          () => {},
        );
        const threads: ReturnType<MigrationBuilder['createReference']>[] = [];
        for (const comment of doc.comments ?? []) {
          const thread = comment.thread?.target;
          if (!thread) {
            continue;
          }

          const messages = await RefArray.loadAll(thread.messages);
          for (const message of messages) {
            // NOTE: Catching errors because some messages may not have block content.
            const { content } = (await message.blocks[0].content?.load().catch(() => ({ content: '' }))) ?? {
              content: '',
            };
            await builder.migrateObject(message.id, ({ data }) => ({
              schema: MessageType,
              props: {
                sender: data.from ?? space.members.get()[0].identity.identityKey.toHex(),
                created: data.blocks[0].timestamp,
                blocks: [{ type: 'text', text: content }],
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
      // Sketches
      //

      const { objects: sketches } = await space.db.query(Filter.schema(LegacyTypes.SketchType)).run();

      // TODO(wittjosiah): Only attempting to migrate canvas content in the browser due to current esm/testing setup.
      let migrateCanvas: MigrateCanvas = async (records) => records;
      if (!isNode()) {
        const { migrateCanvas: migrateCanvasBrowser } = await import('@dxos/plugin-sketch/sdk');
        migrateCanvas = migrateCanvasBrowser;
      }

      for (const sketch of sketches) {
        try {
          const data = await sketch.data.load();
          await builder.migrateObject(sketch.id, async () => {
            return {
              schema: CanvasType,
              props: {
                content: await migrateCanvas(data.content),
                schema: TLDRAW_SCHEMA,
              },
            };
          });

          await builder.migrateObject(sketch.id, ({ data }) => ({
            schema: DiagramType,
            props: {
              name: data.title,
              canvas: data.data,
            },
          }));
        } catch (err) {
          log.warn('Failed to migrate sketch', { id: sketch.id, error: err });
        }
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
    },
  },
];
