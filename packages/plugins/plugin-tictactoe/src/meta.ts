//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { meta as gameMeta } from '@dxos/plugin-game';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.tictactoe'),
  name: 'Tic-Tac-Toe',
  author: 'DXOS',
  description: trim`
    Tic-Tac-Toe adds a fully-featured strategy game to Composer. Games are
    stored as ECHO objects so they replicate in real time across every peer in a
    shared space — two players can join the same game as X and O from separate
    devices and see each other's moves with placement animations as they happen.
    Each move is appended to a semicolon-separated move log, giving a complete
    audit trail of the match.

    The board is configurable at creation time: dimensions can be 3x3, 4x4, or
    5x5, and the win condition (consecutive marks required) can be set
    independently of the board size for a more strategic experience on larger
    grids. When a winning line is completed the cells are highlighted with a
    pulse animation; draws are detected automatically when the board fills
    without a winner.

    A built-in AI engine supports three difficulty levels. Easy plays random
    valid moves. Medium uses a heuristic that prefers winning, then blocking,
    then the centre cell. Hard uses minimax with alpha-beta pruning and plays
    optimally on a 3x3 board. The AI thinking state is shown in the UI during
    computation so the turn transition feels intentional rather than instant.

    The assistant can also participate via blueprint integration: the create,
    makeMove, aiMove, and print operations are exposed as tools so the assistant
    can start a game, analyse the board as ASCII art, play moves, or act as an
    AI opponent in a conversation. The TicTacToeCard component provides a
    compact view suitable for embedding in dashboards or space overview panels.
  `,
  icon: 'ph--hash-straight--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tictactoe',
  spec: 'PLUGIN.mdl',
  dependsOn: [gameMeta.id],
  version: '0.8.3',
  tags: ['labs', 'game'],
};
