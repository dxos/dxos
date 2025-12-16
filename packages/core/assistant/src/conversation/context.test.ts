//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, it } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';

import { AiContextBinder } from './context';

// TODO(burdon): Create mock queue?
const createMockQueue = (): Queue =>
  ({
    query: () =>
      ({
        subscribe: () => ({ unsubscribe: () => {} }),
        results: [],
      }) as any,
    append: async () => {
      return [] as any;
    },
  }) as any;

describe('AiContextBinder', () => {
  it('should handle bind with Ref', async () => {
    const queue = createMockQueue();
    const binder = new AiContextBinder(queue);

    const TestSchema = Schema.Struct({}).pipe(
      Type.Obj({
        typename: 'dxos.org/type/Example',
        version: '0.1.0',
      }),
    );

    const obj = Obj.make(TestSchema, {});
    const ref = Ref.make(obj);

    await binder.bind({
      blueprints: [],
      objects: [ref],
    });
  });
});
