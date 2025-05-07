//
// Copyright 2024 DXOS.org
//

import { addressToA1Notation } from '@dxos/compute';
import { ComputeGraph, ComputeGraphModel, DEFAULT_OUTPUT, NODE_INPUT, NODE_OUTPUT } from '@dxos/conductor';
import { ObjectId, type BaseObject, type TypedObject } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { live, Ref, type Live } from '@dxos/live-object';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { createSheet } from '@dxos/plugin-sheet/types';
import { SheetType, type CellValue } from '@dxos/plugin-sheet/types';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';
import { faker } from '@dxos/random';
import { Filter, type Space } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { createView, TextType } from '@dxos/schema';
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
  cb?: (objects: Live<any>[]) => void,
) => Promise<Live<T>[]>;

export const staticGenerators = new Map<string, ObjectGenerator<any>>([
  [
    DocumentType.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        return space.db.add(
          live(DocumentType, {
            name: faker.commerce.productName(),
            content: Ref.make(live(TextType, { content: faker.lorem.sentences(5) })),
            threads: [],
          }),
        );
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
          live(DiagramType, {
            name: faker.commerce.productName(),
            canvas: Ref.make(live(CanvasType, { content: {} })),
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
  [
    ComputeGraph.typename,
    async (space, n, cb) => {
      const objects = range(n, () => {
        const model = ComputeGraphModel.create();
        model.builder
          .createNode({ id: 'gpt-INPUT', type: NODE_INPUT })
          .createNode({ id: 'gpt-GPT', type: 'gpt' })
          .createNode({
            id: 'gpt-QUEUE_ID',
            type: 'constant',
            value: new DXN(DXN.kind.QUEUE, ['data', space.id, ObjectId.random()]).toString(),
          })
          .createNode({ id: 'gpt-APPEND', type: 'append' })
          .createNode({ id: 'gpt-OUTPUT', type: NODE_OUTPUT })
          .createEdge({ node: 'gpt-INPUT', property: 'prompt' }, { node: 'gpt-GPT', property: 'prompt' })
          .createEdge({ node: 'gpt-GPT', property: 'text' }, { node: 'gpt-OUTPUT', property: 'text' })
          .createEdge({ node: 'gpt-QUEUE_ID', property: DEFAULT_OUTPUT }, { node: 'gpt-APPEND', property: 'id' })
          .createEdge({ node: 'gpt-GPT', property: 'messages' }, { node: 'gpt-APPEND', property: 'items' })
          .createEdge({ node: 'gpt-QUEUE_ID', property: DEFAULT_OUTPUT }, { node: 'gpt-OUTPUT', property: 'queue' });

        return space.db.add(model.root);
      });
      cb?.(objects);
      return objects;
    },
  ],
]);

export const createGenerator = <T extends BaseObject>(type: TypedObject<T>): ObjectGenerator<T> => {
  return async (space: Space, n: number, cb?: (objects: Live<any>[]) => void): Promise<Live<T>[]> => {
    // Find or create mutable schema.
    const schema =
      (await space.db.schemaRegistry.query({ typename: type.typename }).firstOrUndefined()) ??
      (await space.db.schemaRegistry.register([type]))[0];

    // Create objects.
    const generate = createAsyncGenerator(generator, schema.snapshot, { db: space.db });
    const objects = await generate.createObjects(n);

    // Find or create table and view.
    const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
    const table = tables.find((table) => table.view?.target?.query?.typename === type.typename);
    if (!table) {
      const name = type.typename.split('/').pop() ?? type.typename;
      const view = createView({ name, typename: type.typename, jsonSchema: schema.jsonSchema });
      const table = space.db.add(live(TableType, { name, view: Ref.make(view) }));
      cb?.([table]);
    }

    return objects;
  };
};
