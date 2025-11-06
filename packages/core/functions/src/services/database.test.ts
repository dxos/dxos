import { it, describe } from '@effect/vitest';
import { Effect } from 'effect';
import { TestDatabaseLayer } from '../testing';
import { DataType } from '@dxos/schema';
import { DatabaseService } from '.';
import { Obj } from '@dxos/echo';
import { Query } from '@dxos/echo';
import { Rx, Registry } from '@effect-rx/rx';

describe('DatabaseService', () => {
  it.effect(
    'one shot query',
    Effect.fnUntraced(
      function* ({ expect }) {
        const person = yield* DatabaseService.add(
          Obj.make(DataType.Person, {
            fullName: 'John Doe',
          }),
        );

        {
          const objects = yield* DatabaseService.query(Query.type(DataType.Person)).run;
          expect(objects).toEqual([person]);
        }

        {
          const query = yield* DatabaseService.query(Query.type(DataType.Person));
          expect(yield* query.run).toEqual([person]);
        }

        {
          const query = yield* DatabaseService.query(Query.type(DataType.Person));
          expect(yield* Rx.get(query.objects)).toEqual([person]);
        }
      },
      Effect.provide(
        TestDatabaseLayer({
          types: [DataType.Person],
        }),
      ),
      Effect.provide(Registry.layer),
    ),
  );

  it.effect(
    'reactive query',
    Effect.fnUntraced(
      function* ({ expect }) {
        const query = yield* DatabaseService.query(Query.type(DataType.Person));

        const registry = yield* Registry.RxRegistry;
        let results: Obj.Any[][] = [];
        registry.subscribe(
          query.objects,
          (objects) => {
            results.push(objects);
          },
          { immediate: true },
        );

        const person = yield* DatabaseService.add(
          Obj.make(DataType.Person, {
            fullName: 'John Doe',
          }),
        );
        yield* DatabaseService.flush({ indexes: true, updates: true });

        expect(results).toEqual([
          //
          [],
          [person],
        ]);
      },
      Effect.provide(
        TestDatabaseLayer({
          types: [DataType.Person],
        }),
      ),
      Effect.provide(Registry.layer),
    ),
  );
});
