//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import { pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { isInstanceOf, ObjectId, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { ChessAction, ChessType } from '../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: meta.id,
    name: meta.name,
    instructions: `
      - If the user's message relates to a chess game, you must return the chess game inside the artifact tag as a valid FEN string with no additional text.
    `,
    schema: ChessType,
    tools: [
      defineTool(meta.id, {
        name: 'create',
        caption: 'Creating chess game...',
        description: 'Create a new chess game. Returns the artifact definition for the game.',
        schema: S.Struct({
          fen: S.String.annotations({ description: 'The state of the chess game in the FEN format.' }),
        }),
        execute: async ({ fen }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          invariant(extensions?.dispatch, 'No intent dispatcher');
          const intent = pipe(
            createIntent(ChessAction.Create, { fen }),
            chain(SpaceAction.AddObject, { target: extensions.space }),
          );
          const { data, error } = await extensions.dispatch(intent);
          if (!data || error) {
            return ToolResult.Error(error?.message ?? 'Failed to create chess game');
          }

          return ToolResult.Success(createArtifactElement(data.id));
        },
      }),
      defineTool(meta.id, {
        name: 'list',
        caption: 'Getting chess games...',
        description: 'Query all active chess games.',
        schema: S.Struct({}),
        execute: async (_, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects: games } = await extensions.space.db.query(Filter.schema(ChessType)).run();
          invariant(games.length > 0, 'No chess games found');
          return ToolResult.Success(games);
        },
      }),
      defineTool(meta.id, {
        name: 'inspect',
        caption: 'Inspecting game...',
        description: 'Get the current state of the chess game.',
        schema: S.Struct({ id: ObjectId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects: games } = await extensions.space.db.query(Filter.schema(ChessType)).run();
          const game = games.find((game) => game.id === id);
          invariant(isInstanceOf(ChessType, game));
          return ToolResult.Success(game.fen);
        },
      }),
      defineTool(meta.id, {
        name: 'move',
        caption: 'Making chess move...',
        description: 'Make a move in the chess game.',
        schema: S.Struct({
          id: ObjectId,
          move: S.String.annotations({
            description: 'The move to make in the chess game.',
            examples: ['e4', 'Bf3'],
          }),
        }),
        execute: async ({ id, move }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects: games } = await extensions.space.db.query(Filter.schema(ChessType)).run();
          const game = games.find((game) => game.id === id);
          invariant(isInstanceOf(ChessType, game));
          const board = new Chess(game.fen);
          try {
            board.move(move);
          } catch (error: any) {
            return ToolResult.Error(error.message);
          }
          game.pgn = board.pgn();
          game.fen = board.fen();
          return ToolResult.Success(game.fen);
        },
      }),
    ],
  });

  return contributes(Capabilities.ArtifactDefinition, definition);
};
