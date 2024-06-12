//
// Copyright 2024 DXOS.org
//

import { CollectionType } from '@braneframe/types';
import { loadObjectReferences } from '@dxos/echo-db';
import { Expando, ref, S, TypedObject } from '@dxos/echo-schema';
import { type Migration, type ObjectStructure } from '@dxos/migrations';
import { Filter } from '@dxos/react-client/echo';
import { getDeep } from '@dxos/util';

export class FolderType extends TypedObject({ typename: 'braneframe.Folder', version: '0.1.0' })({
  name: S.optional(S.String),
  objects: S.mutable(S.Array(ref(Expando))),
}) {}

export class SectionType extends TypedObject({ typename: 'braneframe.Stack.Section', version: '0.1.0' })({
  object: ref(Expando),
}) {}

export class StackType extends TypedObject({ typename: 'braneframe.Stack', version: '0.1.0' })({
  title: S.optional(S.String),
  sections: S.mutable(S.Array(ref(SectionType))),
}) {}

export const migrations: Migration[] = [
  {
    version: '2024-06-10-collections',
    next: async ({ space, builder }) => {
      const { objects: folders } = await space.db.query(Filter.schema(FolderType)).run();
      const { objects: stacks } = await space.db.query(Filter.schema(StackType)).run();
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
      await builder.changeProperties((propertiesStructure) => {
        // `getDeep` because the root folder property used to be nested.
        const prevRootFolder = getDeep(propertiesStructure.data, FolderType.typename.split('.'));
        propertiesStructure.data[CollectionType.typename] = prevRootFolder ? { ...prevRootFolder } : null;
      });
    },
  },
  {
    version: '2024-06-10-root-collection',
    next: async ({ space, builder }) => {
      if (space.properties[CollectionType.typename]) {
        return;
      }

      const rootId = await builder.addObject(CollectionType, { objects: [], views: {} });
      const rootCollection = await builder.findObject(rootId);
      await builder.changeProperties((propertiesStructure) => {
        propertiesStructure.data[CollectionType.typename] = rootCollection ? { ...rootCollection } : null;
      });
    },
  },
];
