//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import { pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { isInstanceOf, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, parseId, type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { ChessAction, ChessType } from '../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

const ArtifacftId = class extends S.String.annotations({
  description: 'ID of the artifact in <spaceid>:<artifactid> format',
}) {};
type ArtifacftId = S.Schema.Type<typeof ArtifacftId>;

export default () => {
  const definition = defineArtifact({
    id: meta.id,
    name: meta.name,
    description: 'Provides a simple chess engine.',
    instructions: `
      - If the user's message relates to a chess game, you must return the chess game inside the artifact tag as a valid FEN string with no additional text.
      - Always inspect the chess game at the start of every prompt realting to a chess game, as it might have changed since the interaction.
   `,
    schema: ChessType,
    tools: [
      defineTool(meta.id, {
        name: 'create',
        description: 'Create a new chess game. Returns the artifact definition for the game.',
        caption: 'Creating chess game...',
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
        description: 'Query all active chess games.',
        caption: 'Getting games...',
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
        description: 'Get the current state of the chess game.',
        caption: 'Inspecting game...',
        schema: S.Struct({ id: ArtifacftId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects: games } = await extensions.space.db.query(Filter.schema(ChessType)).run();
          const { objectId } = parseId(id);
          const game = games.find((game) => game.id === objectId);
          invariant(isInstanceOf(ChessType, game));
          return ToolResult.Success(game.fen);
        },
      }),
      defineTool(meta.id, {
        name: 'move',
        description: 'Make a move in the chess game.',
        caption: 'Making chess move...',
        schema: S.Struct({
          id: ArtifacftId,
          move: S.String.annotations({
            description: 'The move to make in the chess game.',
            examples: ['e4', 'Bf3'],
          }),
        }),
        execute: async ({ id, move }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects: games } = await extensions.space.db.query(Filter.schema(ChessType)).run();
          const { objectId } = parseId(id);
          const game = games.find((game) => game.id === objectId);
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
