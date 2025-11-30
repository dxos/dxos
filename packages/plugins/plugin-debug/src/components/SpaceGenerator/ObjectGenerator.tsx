//
// Copyright 2024 DXOS.org
//

import { type PromiseIntentDispatcher, createIntent } from '@dxos/app-framework';
import { addressToA1Notation } from '@dxos/compute';
import { ComputeGraph, ComputeGraphModel, DEFAULT_OUTPUT, NODE_INPUT, NODE_OUTPUT } from '@dxos/conductor';
import { DXN, Filter, Key, type Obj, Type } from '@dxos/echo';
import { type TypedObject } from '@dxos/echo/internal';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Sheet } from '@dxos/plugin-sheet/types';
import { Diagram } from '@dxos/plugin-sketch/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { type Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { type ValueGenerator, createAsyncGenerator } from '@dxos/schema/testing';
import { range } from '@dxos/util';

const generator: ValueGenerator = faker as any;

const findViewByTypename = async (views: View.View[], typename: string) => {
  return views.find((view) => getTypenameFromQuery(view.query.ast) === typename);
};

export type ObjectGenerator<T extends Obj.Any> = (space: Space, n: number, cb?: (objects: T[]) => void) => Promise<T[]>;

export const createGenerator = <T extends Obj.Any>(
  client: Client,
  dispatch: PromiseIntentDispatcher,
  schema: TypedObject<T>,
): ObjectGenerator<T> => {
  return async (space: Space, n: number): Promise<T[]> => {
    const typename = schema.typename;

    // Find or create table and view.
    const views = await space.db.query(Filter.type(View.View)).run();
    const view = await findViewByTypename(views, typename);
    const staticSchema = client?.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
    if (!view && !staticSchema) {
      await dispatch(createIntent(SpaceAction.AddSchema, { space, schema, show: false }));
    } else if (!view && staticSchema) {
      await dispatch(createIntent(SpaceAction.UseStaticSchema, { space, typename, show: false }));
    }

    // Create objects.
    const generate = createAsyncGenerator(generator, schema, { db: space.db });
    return generate.createObjects(n);
  };
};

export const staticGenerators = new Map<string, ObjectGenerator<any>>([
  [
    Markdown.Document.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        return space.db.add(
          Markdown.make({
            name: faker.commerce.productName(),
            content: faker.lorem.sentences(5),
          }),
        );
      });

      cb?.(objects);
      return objects;
    },
  ],
  [
    Diagram.Diagram.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        // TODO(burdon): Generate diagram.
        const obj = space.db.add(Diagram.make({ name: faker.commerce.productName() }));

        return obj;
      });

      cb?.(objects);
      return objects;
    },
  ],
  // TODO(burdon): Create unit tests.
  [
    Sheet.Sheet.typename,
    async (space, n, cb) => {
      const objects = range(n).map(() => {
        const cells: Record<string, Sheet.CellValue> = {};
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
          Sheet.make({
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
            value: new DXN(DXN.kind.QUEUE, ['data', space.id, Key.ObjectId.random()]).toString(),
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
