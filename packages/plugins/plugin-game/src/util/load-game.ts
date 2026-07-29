//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, type Ref, Type } from '@dxos/echo';

import * as Game from '../types/Game';

export class GameVariantMismatchError extends Error {
  readonly _tag = 'GameVariantMismatchError';
  constructor(
    readonly gameId: string,
    readonly expectedTypename: string,
    readonly actualTypename: string,
  ) {
    super(`Game ${gameId} variant typename mismatch: expected ${expectedTypename}, got ${actualTypename}.`);
  }
}

/**
 * Loads a Game from a Ref and resolves its variant state, asserting the variant matches
 * the expected type. Returns the typed pair.
 *
 * Use in operation handlers that declare `input.game: GameRef<MyVariantState>`.
 */
export const loadGame = <S extends Type.AnyObj>(
  ref: Ref.Ref<Game.Game>,
  variantType: S,
): Effect.Effect<{ game: Game.Game; variant: Type.InstanceType<S> }, Error, Database.Service> =>
  Effect.gen(function* () {
    const game = yield* Database.load(ref);
    const variant = yield* Database.load(game.variant);
    if (!Obj.instanceOf(variantType, variant)) {
      const expected = Type.getTypename(variantType) ?? 'unknown';
      const actual = Obj.getTypename(variant as Obj.Any) ?? 'unknown';
      return yield* Effect.fail(new GameVariantMismatchError(game.id, expected, actual));
    }
    return { game, variant: variant as Type.InstanceType<S> };
  });
