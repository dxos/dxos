import { it, describe } from '@effect/vitest';
import { Effect } from 'effect';
import { TestDatabaseLayer } from '../testing';
import { DataType } from '@dxos/schema';
import { DatabaseService } from '.';
import { Obj } from '@dxos/echo';
import { Query } from '@dxos/echo';
import { Rx, Registry } from '@effect-rx/rx';
import { Layer } from 'effect';
import { FunctionRegistryService, StaticFunctionsProvider } from './function-registry-service';
import { Function } from '../types/Function';
import { Example } from '../example';

const TestLayer = Layer.provideMerge(
  FunctionRegistryService.layer,
  Layer.mergeAll(
    TestDatabaseLayer({
      types: [DataType.Person, Function],
    }),
    StaticFunctionsProvider.toLayer({ functions: Rx.make(() => [Example.reply]) }),
    Registry.layer,
  ),
);

describe('FunctionRegistryService', () => {
  it.effect(
    'query',
    Effect.fnUntraced(function* ({ expect }) {
      {
        const query = yield* FunctionRegistryService.query();
        expect((yield* query.results).map((_) => _.key)).toEqual([Example.reply.key]);
      }

      {
        const dbFunction = yield* FunctionRegistryService.import(Example.reply);
        expect(Obj.instanceOf(Function, dbFunction)).toBe(true);

        const dbFunction2 = yield* FunctionRegistryService.import(Example.reply);
        expect(dbFunction === dbFunction2).toBe(true);
      }

      {
        const query = yield* FunctionRegistryService.query();
        expect((yield* query.results).map((_) => _.key)).toEqual([Example.reply.key]);
      }

      {
        yield* FunctionRegistryService.import(Example.sleep);
        const query = yield* FunctionRegistryService.query();
        expect((yield* query.results).map((_) => _.key)).toEqual([Example.reply.key, Example.sleep.key]);
      }
    }, Effect.provide(TestLayer)),
  );
});
