//
// Copyright 2023 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { subscriptionHandler } from '@dxos/functions';
import { ChessType } from '@dxos/plugin-chess/types';

import { Engine } from './engine';

/**
 * Trigger configuration.
 */
export const MetaSchema = Schema.mutable(
  Schema.Struct({
    level: Schema.optional(Schema.Number.annotations({ [SchemaAST.DescriptionAnnotationId]: 'Engine strength.' })),
  }),
);

export type Meta = Schema.Schema.Type<typeof MetaSchema>;

/**
 * Runtime types.
 */
export const types = [ChessType];

/**
 * Chess function handler.
 */
export const handler = subscriptionHandler<Meta>(async ({ event, context: { client } }) => {
  const identity = client.halo.identity.get();
  const identityKey = identity!.identityKey.toHex();

  const { meta: { level = 1 } = {}, objects } = event.data;
  for (const game of objects ?? []) {
    const engine = new Engine({ pgn: game.pgn, level });
    if (!engine.state.isGameOver()) {
      if (
        (engine.state.turn() === 'w' && identityKey === game.playerWhite) ||
        (engine.state.turn() === 'b' && identityKey === game.playerBlack)
      ) {
        await engine.move();
        engine.print();

        // Update object.
        game.pgn = engine.state.pgn();
      }
    }
  }
}, types);
