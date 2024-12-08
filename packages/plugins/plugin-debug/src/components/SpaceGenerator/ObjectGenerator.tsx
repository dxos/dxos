//
// Copyright 2024 DXOS.org
//

import { type AbstractSchema, type BaseObject } from '@dxos/echo-schema';
import { create, type ReactiveObject } from '@dxos/live-object';
import { DocumentType, TextType } from '@dxos/plugin-markdown/types';
import { SheetType } from '@dxos/plugin-sheet/types';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { faker } from '@dxos/random';
import { Filter, type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { createView } from '@dxos/schema';
import { createAsyncGenerator, type ValueGenerator } from '@dxos/schema/testing';
import { range } from '@dxos/util';

const generator: ValueGenerator = faker as any;

// TODO(burdon): Create docs.
// TODO(burdon): Create sketches.
// TODO(burdon): Create sheets.
// TODO(burdon): Create comments.
// TODO(burdon): Reuse in testbench-app.
// TODO(burdon): Mutator running in background (factor out): from echo-generator.

export type ObjectGenerator<T extends BaseObject> = (
  space: Space,
  n: number,
  cb?: (objects: ReactiveObject<any>[]) => void,
) => Promise<ReactiveObject<T>[]>;

export const staticGenerators = new Map<string, ObjectGenerator<any>>([
  [
    DocumentType.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        const obj = space.db.add(
          create(DocumentType, {
            name: faker.commerce.productName(),
            content: create(TextType, { content: '' }),
            threads: [],
          }),
        );

        return obj;
      });

      cb?.(objects);
      return objects;
    },
  ],
  [
    DiagramType.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        const obj = space.db.add(
          create(DiagramType, {
            name: faker.commerce.productName(),
            canvas: create(CanvasType, { content: {} }),
          }),
        );

        return obj;
      });

      cb?.(objects);
      return objects;
    },
  ],
  [
    SheetType.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        const obj = space.db.add(
          create(SheetType, {
            name: faker.commerce.productName(),
            cells: {},
            rows: [],
            columns: [],
            rowMeta: {},
            columnMeta: {},
            ranges: [],
            threads: [],
          }),
        );

        return obj;
      });

      cb?.(objects);
      return objects;
    },
  ],
]);

export const createGenerator = <T extends BaseObject>(type: AbstractSchema<T>): ObjectGenerator<T> => {
  return async (
    space: Space,
    n: number,
    onAddObjects?: (objects: ReactiveObject<any>[]) => void,
  ): Promise<ReactiveObject<T>[]> => {
    // Find or create mutable schema.
    const mutableSchema = await space.db.schemaRegistry.query();
    const schema =
      mutableSchema.find((schema) => schema.typename === type.typename) ?? space.db.schemaRegistry.addSchema(type);

    // Create objects.
    const generate = createAsyncGenerator(generator, schema.schema, space.db);
    const objects = await generate.createObjects(n);

    // Find or create table and view.
    const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
    const table = tables.find((table) => table.view?.query?.typename === type.typename);
    if (!table) {
      const name = type.typename.split('/').pop() ?? type.typename;
      const view = createView({ name, typename: type.typename, jsonSchema: schema.jsonSchema });
      const table = space.db.add(create(TableType, { name, view }));

      // Add to UX.
      onAddObjects?.([table]);
    }

    return objects;
  };
};
