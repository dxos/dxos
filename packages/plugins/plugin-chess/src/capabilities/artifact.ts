//
// Copyright 2025 DXOS.org
//

import { Chess } from 'chess.js';

import { Capabilities, contributes } from '@dxos/app-framework';
import { defineArtifact, defineTool, ToolResult } from '@dxos/artifact';
import { createArtifactElement } from '@dxos/assistant';
import { createStatic, type HasId, type HasTypename, isInstanceOf, ObjectId, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ChessType } from '../types';

// TODO(burdon): Move to ECHO def.
export type ArtifactsContext = {
  items: (HasTypename & HasId)[];
  getArtifacts: () => (HasTypename & HasId)[];
  addArtifact: (artifact: HasTypename & HasId) => void;
};

declare global {
  interface ToolContextExtensions {
    artifacts?: ArtifactsContext;
  }
}

export default () => {
  const artifact = defineArtifact({
    id: 'plugin-chess',
    prompt: `
  Chess:
  - If the user's message relates to a chess game, you must return the chess game inside the artifact tag as a valid FEN string with no additional text.
  `,
    schema: ChessType,
    tools: [
      defineTool({
        name: 'chess_new',
        description: 'Create a new chess game. Returns the artifact definition for the game',
        schema: S.Struct({
          fen: S.String.annotations({ description: 'The state of the chess game in the FEN format.' }),
        }),
        execute: async ({ fen }, { extensions }) => {
          invariant(extensions?.artifacts, 'No artifacts context');
          const artifact = createStatic(ChessType, { fen });
          extensions.artifacts.addArtifact(artifact);
          return ToolResult.Success(createArtifactElement(artifact.id));
        },
      }),
      defineTool({
        name: 'chess_query',
        description: 'Query all active chess games.',
        schema: S.Struct({}),
        execute: async (_, { extensions }) => {
          invariant(extensions?.artifacts, 'No artifacts context');
          const artifacts = extensions.artifacts.getArtifacts().filter((artifact) => isInstanceOf(ChessType, artifact));
          invariant(artifacts.length > 0, 'No chess games found');
          return ToolResult.Success(artifacts);
        },
      }),
      defineTool({
        name: 'chess_inspect',
        description: 'Get the current state of the chess game.',
        schema: S.Struct({ id: ObjectId }),
        execute: async ({ id }, { extensions }) => {
          invariant(extensions?.artifacts, 'No artifacts context');
          const artifact = extensions!.artifacts.getArtifacts().find((artifact) => artifact.id === id);
          invariant(isInstanceOf(ChessType, artifact));
          return ToolResult.Success(artifact.fen);
        },
      }),
      defineTool({
        name: 'chess_move',
        description: 'Make a move in the chess game.',
        schema: S.Struct({
          id: ObjectId,
          move: S.String.annotations({
            description: 'The move to make in the chess game.',
            examples: ['e4', 'Bf3'],
          }),
        }),
        execute: async ({ id, move }, { extensions }) => {
          invariant(extensions?.artifacts, 'No artifacts context');
          const artifact = extensions.artifacts.getArtifacts().find((artifact) => artifact.id === id);
          invariant(isInstanceOf(ChessType, artifact));
          const board = new Chess(artifact.fen);
          try {
            board.move(move);
          } catch (error: any) {
            return ToolResult.Error(error.message);
          }
          artifact.fen = board.fen();
          return ToolResult.Success(artifact.fen);
        },
      }),
    ],
  });

  return contributes(Capabilities.Artifact, artifact);
};
