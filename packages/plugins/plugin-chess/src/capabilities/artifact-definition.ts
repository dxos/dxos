//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';
import { pipe, Schema } from 'effect';

import { createTool, ToolResult } from '@dxos/ai';
import { Capabilities, chain, contributes, createIntent, type PromiseIntentDispatcher } from '@dxos/app-framework';
import { defineArtifact } from '@dxos/artifact';
import { createArtifactElement, VersionPin } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { ChessAction, ChessType } from '../types';
import { ArtifactId } from "@dxos/assistant";

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    space?: Space;
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () => {
  const definition = defineArtifact({
    id: `artifact:${meta.id}`,
    name: meta.name,
    description: 'Provides a simple chess engine.',
    instructions: `
      - If the user's message relates to a chess game, you must return the chess game inside the artifact tag as a valid FEN string with no additional text.
      - Always inspect the chess game at the start of every prompt realting to a chess game, as it might have changed since the interaction.
   `,
    schema: ChessType,
    tools: [
      createTool(meta.id, {
        name: 'create',
        description: 'Create a new chess game. Returns the artifact definition for the game.',
        caption: 'Creating chess game...',
        schema: Schema.Struct({
          fen: Schema.String.annotations({ description: 'The state of the chess game in the FEN format.' }),
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

          return ToolResult.Success(createArtifactElement(data.id), [
            VersionPin.createBlock(VersionPin.fromObject(data.object)),
          ]);
        },
      }),
      createTool(meta.id, {
        name: 'list',
        description: 'Query all active chess games.',
        caption: 'Getting games...',
        schema: Schema.Struct({}),
        execute: async (_, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const { objects: games } = await extensions.space.db.query(Filter.type(ChessType)).run();
          invariant(games.length > 0, 'No chess games found');

          return ToolResult.Success(games);
        },
      }),
      createTool(meta.id, {
        name: 'inspect',
        description: 'Get the current state of the chess game.',
        caption: 'Inspecting game...',
        schema: Schema.Struct({ id: ArtifactId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const game = await extensions.space.db
            .query(Filter.ids(ArtifactId.toDXN(id, extensions.space.id).toString()))
            .first();
          invariant(Obj.instanceOf(ChessType, game));

          return ToolResult.Success(game.fen);
        },
      }),
      createTool(meta.id, {
        name: 'move',
        description: 'Make a move in the chess game.',
        caption: 'Making chess move...',
        schema: Schema.Struct({
          id: ArtifactId,
          move: Schema.String.annotations({
            description: 'The move to make in the chess game.',
            examples: ['e4', 'Bf3'],
          }),
        }),
        execute: async ({ id, move }, { extensions }) => {
          invariant(extensions?.space, 'No space');
          const game = await extensions.space.db
            .query(Filter.ids(ArtifactId.toDXN(id, extensions.space.id).toString()))
            .first();
          invariant(Obj.instanceOf(ChessType, game));

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
