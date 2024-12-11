//
// Copyright 2024 DXOS.org
//

import { type AbstractSchema, type BaseObject } from '@dxos/echo-schema';
import { create, type ReactiveObject } from '@dxos/live-object';
import { DocumentType, TextType } from '@dxos/plugin-markdown/types';
import { addressToA1Notation, createSheet } from '@dxos/plugin-sheet';
import { type CellValue } from '@dxos/plugin-sheet/types';
import { SheetType } from '@dxos/plugin-sheet/types';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { faker } from '@dxos/random';
import { Filter, type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { createView } from '@dxos/schema';
import { createAsyncGenerator, type ValueGenerator } from '@dxos/schema/testing';
import { range } from '@dxos/util';

const generator: ValueGenerator = faker as any;

// TODO(burdon): Add objects to collections.
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
            content: create(TextType, { content: faker.lorem.sentences(5) }),
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
        // TODO(burdon): Generate diagram.
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
  // TODO(burdon): Create unit tests.
  [
    SheetType.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        const cells: Record<string, CellValue> = {};
        const year = new Date().getFullYear();
        const cols = 4;
        const rows = 16;
        for (let col = 1; col <= cols; col++) {
          for (let row = 1; row <= rows; row++) {
            const cell = addressToA1Notation({ col, row });
            if (row === 1) {
              cells[cell] = { value: `${year} Q${col}` };
            } else if (row === rows) {
              const from = addressToA1Notation({ col, row: 2 });
              const to = addressToA1Notation({ col, row: rows - 1 });
              cells[cell] = { value: `=SUM(${from}:${to})` };
            } else if (row > 2 && row < rows - 1) {
              cells[cell] = { value: Math.floor(Math.random() * 10_000) };
            }
          }
        }

        // TODO(burdon): Set width.
        // TODO(burdon): Set formatting for columns.
        return space.db.add(
          createSheet({
            name: faker.commerce.productName(),
            cells,
          }),
        );
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
    cb?: (objects: ReactiveObject<any>[]) => void,
  ): Promise<ReactiveObject<T>[]> => {
    // Find or create mutable schema.
    const schema =
      (await space.db.schemaRegistry.query({ typename: type.typename }).firstOrUndefined()) ??
      space.db.schemaRegistry.addSchema(type);

    // Create objects.
    const generate = createAsyncGenerator(generator, schema.schema, { db: space.db });
    const objects = await generate.createObjects(n);

    // Find or create table and view.
    const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
    const table = tables.find((table) => table.view?.query?.typename === type.typename);
    if (!table) {
      const name = type.typename.split('/').pop() ?? type.typename;
      const view = createView({ name, typename: type.typename, jsonSchema: schema.jsonSchema });
      const table = space.db.add(create(TableType, { name, view }));
      cb?.([table]);
    }

    return objects;
  };
};
