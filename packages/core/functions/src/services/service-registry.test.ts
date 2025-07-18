import { describe, it } from '@effect/vitest';
import { Context, Effect, Layer, Option } from 'effect';
import { ServiceRegistry } from './service-registry';

class MyTag extends Context.Tag('MyTag')<MyTag, { value: string }>() {}

const mockRegistry = Layer.succeed(ServiceRegistry, {
  resolve: (tag) => ((tag as any) === MyTag ? Option.some({ value: 'test' } as any) : Option.none()),
});

describe('ServiceRegistry', () => {
  it.effect(
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

  it.effect(
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
