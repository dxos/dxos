import { it, describe } from '@effect/vitest';
import { Effect } from 'effect';
import { TestDatabaseLayer } from '../testing';
import { DataType } from '@dxos/schema';
import { DatabaseService } from '.';
import { Obj } from '@dxos/echo';
import { Query } from '@dxos/echo';

describe('DatabaseService', () => {
  it.effect(
    'should resolve an object by its DXN',
    Effect.fnUntraced(
      function* ({ expect }) {
        const person = yield* DatabaseService.add(
          Obj.make(DataType.Person, {
            fullName: 'John Doe',
          }),
        );

        const objects = yield* DatabaseService.query(Query.type(DataType.Person)).objects;
        expect(objects).toEqual([person]);
      },
      Effect.provide(
        TestDatabaseLayer({
          types: [DataType.Person],
        }),
      ),
    ),
  );
});
