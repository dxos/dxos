//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { Database, Obj, type Ref, type Type } from '@dxos/echo';

import { Game } from '../types/Game';

export class GameVariantMismatchError extends Error {
  readonly _tag = 'GameVariantMismatchError';
  constructor(readonly gameId: string, readonly expectedTypename: string, readonly actualTypename: string) {
    super(
      `Game ${gameId} variant typename mismatch: expected ${expectedTypename}, got ${actualTypename}.`,
    );
  }
}

/**
 * Loads a Game from a Ref and resolves its variant state, asserting the variant matches
 * the expected schema. Returns the typed pair.
 *
 * Use in operation handlers that declare `input.game: GameRef<MyVariantState>`.
 */
export const loadGame = <S extends Type.AnyObj>(
  ref: Ref.Ref<Game>,
  variantSchema: S,
): Effect.Effect<{ game: Game; variant: Schema.Schema.Type<S> }, Error, Database.Service> =>
  Effect.gen(function* () {
    const game = yield* Database.load(ref);
    const variant = yield* Database.load(game.variant);
    if (!Obj.instanceOf(variantSchema, variant)) {
      const expected = (variantSchema as any).typename ?? 'unknown';
      const actual = Obj.getTypename(variant as Obj.Any) ?? 'unknown';
      return yield* Effect.fail(new GameVariantMismatchError(game.id, expected, actual));
    }
    return { game, variant: variant as Schema.Schema.Type<S> };
  });
