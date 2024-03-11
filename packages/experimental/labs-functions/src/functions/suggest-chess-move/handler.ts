//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { Chess } from 'chess.js';

import { signalHandler } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

import { type ChainVariant, createChainResources } from '../../chain';

const SuggestNextMoveFunctionInput = S.struct({
  gameState: S.string,
  outputFormat: S.string,
  activeObjectId: S.string,
});

export const handler = signalHandler(SuggestNextMoveFunctionInput, async ({ event, context, response }) => {
  const chess = new Chess();
  chess.loadPgn(event.gameState);
  const moves = chess.moves({ verbose: true });
  const move = moves[Math.floor(Math.random() * moves.length)];
  invariant(typeof move === 'object');

  const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai');
  const sequence = RunnableSequence.from([
    { history: () => event.gameState, from: () => move.from, to: () => move.to },
    PromptTemplate.fromTemplate(
      `You are a machine that is an expert chess player. 
       The move history of the current game is: {history}
       And the next suggested move is from {from} to {to}. 
       In a few sentences explain why the suggested move is good.
      `.replace(/ +/g, ' '),
    ),
    resources.model,
    new StringOutputParser(),
  ]);
  const explanation = await sequence.invoke('');
  return response.status(200).body({
    type: 'make-next-chess-move',
    value: {
      gameId: event.activeObjectId,
      inputGameState: event.gameState,
      from: move.from,
      to: move.to,
      explanation,
    },
  });
});
