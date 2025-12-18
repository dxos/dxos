//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import * as A from '@automerge/automerge';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
// @ts-ignore
import { Chess as ChessJS } from 'https://esm.sh/chess.js@0.13.1?bundle=false';

import { AiService, ConsolePrinter, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiSession, GenerationObserver } from '@dxos/assistant';
import { ArtifactId } from '@dxos/assistant';
import { Database, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { refFromEncodedReference } from '@dxos/echo/internal';
import { createDocAccessor } from '@dxos/echo-db';
import { TracingService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Chess } from '@dxos/plugin-chess/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection, Text } from '@dxos/schema';
import { HasSubject } from '@dxos/types';
import { trim } from '@dxos/util';

// TODO(mykola): Make not failing on missing Chess.pgn
// TODO(mykola):
export default defineFunction({
  key: 'dxos.org/function/chess/commentary',
  name: 'Commentary',
  description: 'Adds commentary about the most recent move to a markdown document associated with the chess game.',
  inputSchema: Schema.Struct({
    game: Type.Ref(Chess.Game).annotations({
      description: 'The chess game to comment on.',
    }),
  }),
  outputSchema: Schema.Union(
    Schema.Struct({
      documentId: ArtifactId.annotations({
        description: 'The ID of the markdown document that was updated or created.',
      }),
      commentary: Schema.String.annotations({
        description: 'The commentary that was added.',
      }),
    }),
    Schema.Void.annotations({
      description: 'Function did not find anything to comment on.',
    }),
  ),
  types: [Chess.Game, Markdown.Document, Text.Text, HasSubject.HasSubject, Collection.Collection],
  services: [AiService.AiService, Database.Service],
  handler: Effect.fnUntraced(
    function* ({ data: { game: gameRefSerialized } }) {
      log.info('load game', { gameRefSerialized });
      // TODO(wittjosiah): The runtime should handle this conversion before passing to the function.
      const { db } = yield* Database.Service;
      const gameRef = refFromEncodedReference(
        gameRefSerialized as any,
        db.graph.createRefResolver({ context: { space: db.spaceId } }),
      );
      log.info('load game', { gameRef });
      // Load the chess game
      const chessGame = yield* Database.Service.load(gameRef);

      // Load the chess position from PGN or FEN
      const chess = new ChessJS();
      if (chessGame.pgn) {
        chess.loadPgn(chessGame.pgn);
      } else if (chessGame.fen) {
        chess.load(chessGame.fen);
      } else {
        log.info('Early return: no pgn or fen');
        return;
      }

      // Get the most recent move
      const history = chess.history({ verbose: true });
      if (history.length === 0) {
        throw new Error('No moves have been played yet');
      }
      const lastMove = history[history.length - 1];
      const moveNumber = Math.ceil(history.length / 2);
      const isWhiteMove = history.length % 2 === 1;
      const player = isWhiteMove ? 'White' : 'Black';
      const moveNotation = lastMove.san;

      // Generate AI commentary about the move
      const result = yield* new AiSession().run({
        prompt:
          `Comment on this chess move as if you're commentating a live match for an audience:\n\n` +
          `Move ${moveNumber}: ${player} plays ${moveNotation} (${lastMove.from} to ${lastMove.to})${lastMove.captured ? `, capturing ${lastMove.captured}` : ''}\n` +
          `Current position: ${chess.fen()}\n` +
          `${chess.isCheck() ? 'The king is in check! ' : ''}` +
          `${chess.isCheckmate() ? 'CHECKMATE! ' : ''}` +
          `${chess.isStalemate() ? 'STALEMATE! ' : ''}` +
          `\nGame so far:\n${chess.pgn()}`,
        system: COMMENTARY_SYSTEM_PROMPT,
        history: [],
        observer: GenerationObserver.fromPrinter(new ConsolePrinter({ tag: 'chess-commentary' })),
      });

      const commentaryText = Function.pipe(
        result,
        Array.findLast((msg) => msg.sender.role === 'assistant' && msg.blocks.some((block) => block._tag === 'text')),
        Option.flatMap((msg) =>
          Function.pipe(
            msg.blocks,
            Array.findLast((block) => block._tag === 'text'),
            Option.map((block) => block.text),
          ),
        ),
        Option.getOrThrowWith(() => new Error('No commentary generated')),
      );

      const commentary = `## Move ${moveNumber}: ${player} plays ${moveNotation}\n\n${commentaryText}\n\n`;
      log.info('commentary', { commentary });

      // TODO(wittjosiah): Functions currently don't support traversals.
      // const docs = yield* Database.Service.runQuery(
      //   Query.select(Filter.id(chessGame.id)).targetOf(HasSubject.HasSubject).source(),
      // ).pipe(Effect.map((objects) => objects.filter((object) => Obj.instanceOf(Markdown.Document, object))));
      const docs = yield* Database.Service.runQuery(Filter.type(HasSubject.HasSubject)).pipe(
        Effect.map((relations) =>
          relations.filter((relation) => {
            // TODO(wittjosiah): This is a workaround for getTarget not handling deleted objects.
            try {
              log.info('relation', {
                source: Obj.getDXN(Relation.getTarget(relation)).toString(),
                game: Obj.getDXN(chessGame).toString(),
              });
              return Obj.getDXN(Relation.getTarget(relation)).toString() === Obj.getDXN(chessGame).toString();
            } catch {
              return false;
            }
          }),
        ),
        Effect.map((relations) =>
          relations
            .map((relation) => {
              // TODO(wittjosiah): This is a workaround for getSource not handling deleted objects.
              try {
                return Relation.getSource(relation);
              } catch {
                return undefined;
              }
            })
            .filter((source) => source !== undefined),
        ),
        Effect.map((sources) => {
          const docs = sources.filter((source) => Obj.instanceOf(Markdown.Document, source));
          log.info('docs', { sources, docs });
          return docs;
        }),
      );
      log.info('docs', { count: docs.length });

      let document: Markdown.Document;
      if (docs.length === 0) {
        // TODO(wittjosiah): Deploy fails if `SpaceProperties` schema is imported because its from `client-protocol`.
        const [properties] = yield* Database.Service.runQuery(Filter.typename('dxos.org/type/Properties'));
        const rootCollection = yield* Database.Service.load<Collection.Collection>(
          properties[Collection.Collection.typename],
        );

        log.info('rootCollection', { rootCollection });

        // Create a new markdown document
        const gameName = chessGame.name || 'Chess Game';
        document = yield* Database.Service.add(
          Markdown.make({
            name: `${gameName} Commentary`,
            content: `# ${gameName} Commentary\n\n${commentary}`,
          }),
        );

        rootCollection.objects.push(Ref.make(document));

        // Create the HasSubject relation
        yield* Database.Service.add(
          Relation.make(HasSubject.HasSubject, {
            [Relation.Source]: document,
            [Relation.Target]: chessGame,
            completedAt: new Date().toISOString(),
          }),
        );
      } else {
        document = docs[0];

        // Load the text content and append the commentary
        const text = yield* Database.Service.load(document.content);
        const accessor = createDocAccessor(text, ['content']);
        accessor.handle.change((doc: A.Doc<Text.Text>) => {
          A.splice(doc, accessor.path.slice(), text.content.length, 0, commentary);
        });
      }

      log.info('result', { documentId: Obj.getDXN(document).toString(), commentary });

      yield* Database.Service.flush();

      return {
        documentId: Obj.getDXN(document).toString(),
        commentary,
      };
    },
    Effect.provide(
      Layer.mergeAll(
        AiService.model('@anthropic/claude-haiku-4-5'),
        ToolResolverService.layerEmpty,
        ToolExecutionService.layerEmpty,
        TracingService.layerNoop,
      ),
    ),
  ),
});

const COMMENTARY_SYSTEM_PROMPT = trim`
  You are a professional chess commentator providing live commentary for a chess match.

  # Style
  - Write in an engaging, enthusiastic style as if commentating for a live audience
  - Be concise but informative (2-4 sentences)
  - Explain the strategic implications of the move
  - Note any tactical elements (captures, threats, checks)
  - Comment on the position and what it means for the game

  # Format
  - Write in plain text (no markdown formatting in the commentary itself)
  - Be natural and conversational
  - Use chess terminology appropriately but keep it accessible

  # Special Situations
  - If it's checkmate, express excitement about the conclusion
  - If it's check, note the pressure on the king
  - If a piece is captured, mention the material exchange
  - Comment on the development of pieces and control of key squares when relevant
`;
