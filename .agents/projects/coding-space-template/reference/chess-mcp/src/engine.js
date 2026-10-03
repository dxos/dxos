//
// A small negamax engine, bundled with the Worker.
//
// The template's stage one asks how the engine gets into the Worker and demands a stated fallback
// if a WASM build does not fit. This IS that fallback: alpha-beta over chess.js with a
// material-plus-mobility evaluation, depth-bounded so a tool call returns inside a chat's patience.
// It plays weakly compared with Stockfish and is not trying to compete — the point it has to carry
// is that the move comes from a search on the server, not from a language model's memory.
//

import { Chess } from 'chess.js';

const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/** Centipawn score from White's point of view. */
const evaluate = (chess) => {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -100000 : 100000;
  }
  if (chess.isDraw()) {
    return 0;
  }

  let score = 0;
  for (const row of chess.board()) {
    for (const square of row) {
      if (square) {
        score += (square.color === 'w' ? 1 : -1) * VALUE[square.type];
      }
    }
  }

  // Mobility, as a light positional term. Counted for the side to move only, which is all chess.js
  // offers without a null move, so it is signed accordingly rather than differenced.
  score += (chess.turn() === 'w' ? 1 : -1) * chess.moves().length * 2;
  return score;
};

/**
 * Captures and promotions first.
 *
 * Alpha-beta prunes only as well as its move order: on chess.js's natural order a wide middlegame
 * searches almost the full tree, which is what put depth 3 over a five-second budget before this.
 */
const ordered = (chess) => {
  const moves = chess.moves();
  return [...moves].sort((a, b) => rank(b) - rank(a));
};

const rank = (move) => (move.includes('#') ? 3 : move.includes('=') ? 2 : move.includes('x') ? 1 : 0);

const negamax = (chess, depth, alpha, beta, budget) => {
  budget.nodes -= 1;
  if (depth === 0 || chess.isGameOver() || budget.nodes <= 0) {
    return chess.turn() === 'w' ? evaluate(chess) : -evaluate(chess);
  }

  let best = -Infinity;
  for (const move of ordered(chess)) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, budget);
    chess.undo();
    if (score > best) {
      best = score;
    }
    if (best > alpha) {
      alpha = best;
    }
    // Beta cutoff: this line is already worse for the mover than one they can force elsewhere.
    if (alpha >= beta) {
      break;
    }
  }
  return best;
};

/**
 * Searches for the best move from `fen`, bounded by `depth` and a node count.
 *
 * The bound is nodes rather than wall-clock on purpose: `Date.now()` does not advance during
 * synchronous compute in a Worker, so a time deadline never fires there and reports `elapsedMs: 0`.
 * Depth alone is not enough either — a wide middlegame is far more work than a quiet endgame at the
 * same depth — so the node budget is what actually keeps a tool call inside a chat's patience.
 */
export const search = ({ fen, depth = 2, maxNodes = 5000 }) => {
  const chess = new Chess(fen);
  const budget = { nodes: maxNodes };

  // Checkmate and draw have no legal move, so the loop below would leave `bestScore` at -Infinity —
  // which `JSON.stringify` writes as `null`. Answer with the terminal evaluation instead.
  if (chess.isGameOver()) {
    return {
      bestMove: null,
      scoreCentipawns: evaluate(chess),
      depth,
      nodesSearched: 0,
      truncated: false,
      turn: chess.turn() === 'w' ? 'white' : 'black',
      legalMoves: 0,
    };
  }

  let bestMove = null;
  let bestScore = -Infinity;
  for (const move of ordered(chess)) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -Infinity, Infinity, budget);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return {
    bestMove,
    // Reported from White's point of view, which is the convention every chess UI shows.
    scoreCentipawns: chess.turn() === 'w' ? bestScore : -bestScore,
    depth,
    nodesSearched: maxNodes - budget.nodes,
    // Truncated once the node budget ran out, which is the caller's signal that a deeper answer
    // exists and this one is the best found inside the bound.
    truncated: budget.nodes <= 0,
    turn: chess.turn() === 'w' ? 'white' : 'black',
    legalMoves: chess.moves().length,
  };
};

/** Static evaluation plus the legal-move count — no search. */
export const evaluateFen = (fen) => {
  const chess = new Chess(fen);
  return {
    scoreCentipawns: evaluate(chess),
    turn: chess.turn() === 'w' ? 'white' : 'black',
    legalMoves: chess.moves().length,
    inCheck: chess.inCheck(),
    isGameOver: chess.isGameOver(),
  };
};
