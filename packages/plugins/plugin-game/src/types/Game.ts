//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

/**
 * A player in a game.
 * `role` is variant-defined (e.g. 'white' | 'black' for chess, 'x' | 'o' for tictactoe).
 * `identity` is the optional DID of a human player; absent for AI or empty seats.
 * `name` is an optional display label (useful for AI/guest players).
 */
export const Player = Schema.Struct({
  role: Schema.String.annotations({
    description: 'Variant-defined player role (e.g. "white", "x").',
  }),
  identity: Schema.optional(
    Schema.String.annotations({
      description: 'DID of the player; absent for AI or empty seats.',
    }),
  ),
  name: Schema.optional(
    Schema.String.annotations({
      description: 'Optional display name for the player.',
    }),
  ),
});

export type Player = Schema.Schema.Type<typeof Player>;

/**
 * Base Game object. Variant-specific state lives in a separate referenced object.
 * Unifies all game variants (chess, tic-tac-toe, ...) under one typename so they share
 * graph node, create flow, and shared surface scaffolding.
 */
export const Game = Schema.Struct({
  name: Schema.optional(Schema.String),
  players: Schema.mutable(Schema.Array(Player))
    .annotations({ description: 'Players in the game.' })
    .pipe(FormInputAnnotation.set(false), Schema.optional),
  variant: Ref.Ref(Obj.Unknown)
    .annotations({ description: 'Reference to variant-specific state object.' })
    .pipe(FormInputAnnotation.set(false)),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--sword--regular',
    hue: 'indigo',
  }),
  // Delegate the graph-node icon to the referenced variant state's schema. Falls back to
  // the static `ph--sword--regular` above while the variant ref is still loading.
  Annotation.IconFromRefAnnotation.set('variant'),
  Type.makeObject(DXN.make('org.dxos.type.game', '0.1.0')),
);

export type Game = Type.InstanceType<typeof Game>;

/**
 * Variant-narrowed reference to a Game.
 *
 * Encodes — at the type level — that the variant ref points to a specific state type.
 * Runtime narrowing is performed by `loadGame(ref, variantType)` which validates and
 * returns the resolved Game together with its typed variant state.
 *
 * @example
 * ```ts
 * input: Schema.Struct({
 *   game: GameRef(Chess.State),
 * }),
 * // handler:
 * const { game, variant } = yield* loadGame(input.game, Chess.State);
 * // `variant` is typed as Chess.State.
 * ```
 */
export type GameRef<_V> = Ref.Ref<Game>;

export const GameRef = <S extends Type.AnyObj>(_variantType: S) =>
  Ref.Ref(Game) as Schema.Schema<GameRef<Type.InstanceType<S>>, any, never>;

/**
 * Build a base `Game` object referencing the given variant-state ECHO object.
 *
 * The variant is stored as a `Ref` so the underlying state (e.g. `Chess.State`,
 * `TicTacToe.State`) lives as its own ECHO object alongside the Game.
 *
 * @param name Optional display name shown in the graph node and Properties form.
 * @param variant Variant-specific state object (e.g. `Chess.State`, `TicTacToe.State`).
 * @param players Optional initial players; copied into a mutable array on the Game.
 * @returns A new `Game` object with `variant` stored as a Ref.
 */
export const make = ({
  name,
  players,
  variant,
}: {
  name?: string;
  players?: ReadonlyArray<Player>;
  variant: Obj.Unknown;
}): Game => {
  return Obj.make(Game, {
    name,
    players: players ? [...players] : [],
    variant: Ref.make(variant),
  });
};
