//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { ServiceRegistry } from './service-registry';

class MyTag extends Context.Tag('MyTag')<MyTag, { value: string }>() {}

const mockRegistry = Layer.succeed(ServiceRegistry, {
  resolve: (tag) => ((tag as any) === MyTag ? Option.some({ value: 'test' } as any) : Option.none()),
});

Test.describe('ServiceRegistry', () => {
  Test.it.effect(
    'provide',
    Effect.fn(function* ({ expect }) {
      const body = Effect.gen(function* () {
        const { value } = yield* MyTag;
        expect(value).toEqual('test');
      });

      const eff = body.pipe(ServiceRegistry.provide(MyTag));
      yield* eff;
    }, Effect.provide(mockRegistry)),
  );

  Test.it.effect(
    'provide or die',
    Effect.fn(function* ({ expect }) {
      const body = Effect.gen(function* () {
        const { value } = yield* MyTag;
        expect(value).toEqual('test');
      });

      const eff = body.pipe(ServiceRegistry.provideOrDie(MyTag));
      yield* eff;
    }, Effect.provide(mockRegistry)),
  );
});
