//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import * as Capability from './capability';
import * as CapabilityManager from './capability-manager';

type Example = { example: string };

describe('Capability tags', () => {
  it('singleton tags are yieldable Effect services', () => {
    const tag = Capability.makeSingleton<Example>()('org.dxos.test.example');
    expect(tag.key).toEqual(tag.identifier);
    expect(tag.arity).toEqual('single');

    const implementation = { example: 'value' };
    const program = Effect.gen(function* () {
      const value = yield* tag;
      return value.example;
    });
    const result = Effect.runSync(program.pipe(Effect.provide(Context.make(tag, implementation))));
    expect(result).toEqual('value');
  });

  it.effect('multi tags yield a live contributions view', () =>
    Effect.gen(function* () {
      const registry = Registry.make();
      const manager = CapabilityManager.make({ registry });
      const multi = Capability.make<Example>()('org.dxos.test.example');
      expect(multi.arity).toEqual('multi');

      const program = Effect.gen(function* () {
        const contributions = yield* multi;
        return contributions;
      });
      const view = yield* program.pipe(Effect.provide(Context.make(multi, manager.contributions(multi))));

      expect(view.get()).toEqual([]);
      const implementation = { example: 'value' };
      manager.contribute({ interface: multi, implementation, module: 'test' });
      expect(view.get()).toEqual([implementation]);
    }),
  );

  it('tags remain assignable to the legacy InterfaceDef', () => {
    const single = Capability.makeSingleton<Example>()('org.dxos.test.single');
    const multi = Capability.make<Example>()('org.dxos.test.multi');
    const defs: Capability.InterfaceDef<Example>[] = [single, multi];
    expect(defs.map((def) => def.identifier)).toEqual([single.identifier, multi.identifier]);

    // Legacy contributes accepts both arities during the migration window.
    const legacy = Capability.contributes(single, { example: 'value' });
    expect(legacy.interface).toBe(single);
  });

  describe('provide', () => {
    it('creates branded contributions', () => {
      const single = Capability.makeSingleton<Example>()('org.dxos.test.single');
      const contribution = Capability.provide(single, { example: 'value' });
      expect(Capability.isContribution(contribution)).toBe(true);
      expect(Capability.isContribution(Capability.contributes(single, { example: 'value' }))).toBe(false);
      expect(contribution.capability).toBe(single);
      expect(contribution.values).toEqual([{ example: 'value' }]);
    });

    it('provideAll carries multiple values for a multi capability', () => {
      const multi = Capability.make<Example>()('org.dxos.test.multi');
      const contribution = Capability.provideAll(multi, [{ example: 'one' }, { example: 'two' }]);
      expect(contribution.values).toHaveLength(2);
    });

    it('rejects arity crossing at the type level', () => {
      const single = Capability.makeSingleton<Example>()('org.dxos.test.single');
      const multi = Capability.make<Example>()('org.dxos.test.multi');

      // @ts-expect-error provideAll only accepts multi capabilities.
      Capability.provideAll(single, [{ example: 'value' }]);
      // Singleton and multi tags are not interchangeable in typed positions (runtime still
      // executes the push; only the type is rejected).
      const singletonOnly: Capability.Tag<Example>[] = [single];
      // @ts-expect-error a multi tag is not a singleton tag.
      singletonOnly.push(multi);
      expect(singletonOnly).toHaveLength(2);
    });
  });

  describe('type-level enforcement', () => {
    it('EnsureProvides accepts complete returns and rejects missing capabilities', () => {
      const a = Capability.makeSingleton<Example>()('org.dxos.test.a');
      const b = Capability.make<Example>()('org.dxos.test.b');

      type Provides = readonly [typeof a, typeof b];
      // Contributions are branded by the capability identifier (what `provide` returns), not the tag.
      type CompleteReturn = Array<
        | Capability.Contribution<Capability.IdentifierOf<typeof a>>
        | Capability.Contribution<Capability.IdentifierOf<typeof b>>
      >;
      type IncompleteReturn = Array<Capability.Contribution<Capability.IdentifierOf<typeof a>>>;

      const complete: Capability.EnsureProvides<CompleteReturn, Provides> = 'anything passes when covered';
      // @ts-expect-error the branded error type is unconstructible from a string.
      const incomplete: Capability.EnsureProvides<IncompleteReturn, Provides> = 'missing b';
      expect(complete).toBeDefined();
      expect(incomplete).toBeDefined();
    });

    it('Requirements exposes the identifiers of the declared requires', () => {
      const a = Capability.makeSingleton<Example>()('org.dxos.test.a');

      // A program yielding the declared tag typechecks against Requirements.
      const program: Effect.Effect<Example, never, Capability.Requirements<readonly [typeof a]>> = Effect.gen(
        function* () {
          return yield* a;
        },
      );

      const undeclared = Capability.makeSingleton<Example>()('org.dxos.test.undeclared');
      // @ts-expect-error yielding an undeclared capability is rejected by the R channel.
      const invalid: Effect.Effect<Example, never, Capability.Requirements<readonly []>> = Effect.gen(function* () {
        return yield* undeclared;
      });
      expect(program).toBeDefined();
      expect(invalid).toBeDefined();
    });
  });
});
