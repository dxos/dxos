//
// Copyright 2024 DXOS.org
//

import {
  createBindingId,
  createShapeId,
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  defaultShapeTools,
  defaultTools,
  Editor,
  type SerializedStore,
  type TLEditorOptions,
  type TLRecord,
} from '@tldraw/tldraw';

import { type AbstractSchema, type BaseObject } from '@dxos/echo-schema';
import { create, type ReactiveObject } from '@dxos/live-object';
import { DocumentType, TextType } from '@dxos/plugin-markdown/types';
import { addressToA1Notation, createSheet } from '@dxos/plugin-sheet';
import { type CellValue } from '@dxos/plugin-sheet/types';
import { SheetType } from '@dxos/plugin-sheet/types';
import { TLDRAW_SCHEMA, CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { faker } from '@dxos/random';
import { Filter, type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { createView } from '@dxos/schema';
import { createAsyncGenerator, type ValueGenerator } from '@dxos/schema/testing';
import { range } from '@dxos/util';

const generator: ValueGenerator = faker as any;

// TODO(burdon): Add objects to collections.
// TODO(burdon): Create comments.
// TODO(burdon): Reuse in testbench-app.
// TODO(burdon): Mutator running in background (factor out): from echo-generator.

export type ObjectGenerator<T extends BaseObject> = (
  space: Space,
  n: number,
  cb?: (objects: ReactiveObject<any>[]) => void,
) => Promise<ReactiveObject<T>[]>;

// TODO(burdon): Factor out and create unit tests. See "fuzz" patterns.
export const staticGenerators = new Map<string, ObjectGenerator<any>>([
  //
  // DocumentType
  //
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
  //
  // DiagramType
  //
  [
    DiagramType.typename,
    async (space, n, cb) => {
      const options: Pick<TLEditorOptions, 'bindingUtils' | 'shapeUtils' | 'tools' | 'getContainer'> = {
        bindingUtils: defaultBindingUtils,
        shapeUtils: defaultShapeUtils,
        tools: [...defaultTools, ...defaultShapeTools],
        getContainer: () => document.body, // TODO(burdon): Fake via JSDOM?
      };

      const objects = range(n).map(() => {
        const store = createTLStore();
        const editor = new Editor({ ...options, store });

        const a = createShapeId();
        const b = createShapeId();

        {
          editor.createShape({
            id: a,
            type: 'geo',
            x: -40,
            y: -40,
            props: { w: 80, h: 80, text: 'A' },
          });

          editor.createShape({
            id: b,
            type: 'geo',
            x: 120,
            y: -40,
            props: { w: 80, h: 80, text: 'B' },
          });
        }

        {
          const arrow = createShapeId();
          editor.createShape({ id: arrow, type: 'arrow' });

          // TODO(burdon): Causes error:
          //  Uncaught (in promise) TypeError: Cannot define property Symbol(@dxos/schema/Schema), object is not extensible

          editor.createBinding({
            id: createBindingId(),
            type: 'arrow',
            fromId: arrow,
            toId: a,
            props: {
              terminal: 'start',
              isExact: false,
              isPrecise: false,
              normalizedAnchor: { x: 0.5, y: 0.5 },
            },
          });

          editor.createBinding({
            id: createBindingId(),
            type: 'arrow',
            fromId: arrow,
            toId: b,
            props: {
              terminal: 'end',
              isExact: false,
              isPrecise: false,
              normalizedAnchor: { x: 0.5, y: 0.5 },
            },
          });
        }

        const data = store.getStoreSnapshot();
        // TODO(burdon): Strip readonly properties (e.g., `meta`). Factor out.
        const content: SerializedStore<TLRecord> = JSON.parse(JSON.stringify(data.store));

        editor.dispose();
        store.dispose();

        const obj = space.db.add(
          create(DiagramType, {
            name: faker.commerce.productName(),
            canvas: create(CanvasType, { schema: TLDRAW_SCHEMA, content }),
          }),
        );

        return obj;
      });

      cb?.(objects);
      return objects;
    },
  ],
  //
  // SheetType
  //
  [
    SheetType.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        // TODO(burdon): Reconcile with plugin-sheet/testing
        const year = new Date().getFullYear();
        const cols = 4;
        const rows = 10;
        const cells: Record<string, CellValue> = {};
        for (let col = 1; col <= cols; col++) {
          for (let row = 1; row <= 10; row++) {
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
      cb?.([table]);
    }

    return objects;
  };
};
