//
// Copyright 2026 DXOS.org
//

import { type Manifest } from '../types.ts';

const SPEC_LINES = [
  'test QA-1: Start a game and play the opening',
  '  desc: The core chess round-trip - create a game, play the first few moves, read the position back.',
  '  actors: human',
  '  given:',
  '    - an identity exists',
  '    - space: a space is open',
  '  steps:',
  '    - name: Create the game',
  '      do: In the navtree, click + on a collection and choose Chess. Name it "QA Game".',
  '      expect: a Game appears under the collection with pieces in their starting positions, white to move',
  '    - name: Play 1. e4',
  '      do: Drag the e2 pawn to e4.',
  '      invoke: [op:submitMove] { game: $given.game, move: "e4" }',
  '      expect: the pawn stands on e4, the move list reads "1. e4", and it is black\'s turn',
  '    - name: Play 1... e5',
  '      do: Drag the black e7 pawn to e5.',
  '      expect: the move list reads "1. e4 e5" and it is white\'s turn again',
  '    - name: Play 2. Nf3',
  '      do: Drag the g1 knight to f3.',
  '      expect: the knight stands on f3 and the move list reads "1. e4 e5 2. Nf3"',
  '  after:',
  '    - name: Delete the game',
  '      do: Right-click "QA Game" in the navtree and choose Delete.',
];

/**
 * Example data for storybook and the dev server: a published chess take with made-up chapter times, so the player
 * can be developed without packing a bundle. Never shipped in a bundle; `pack.mjs` replaces the manifest.
 */
export const sampleManifest: Manifest = {
  format: 'autocue@1',
  title: 'Chess (example)',
  created: '2026-10-29T06:00:00.000Z',
  demos: [
    {
      id: 'plugin-chess-play-the-opening',
      title: 'Play the opening',
      description: 'Start a chess game, play the opening by dragging pieces, and watch an illegal move be refused.',
      duration: 14.9,
      narrated: false,
      videos: [{ src: 'https://assets.composer.space/demos/2026-10-16-plugin-chess.mp4', type: 'video/mp4' }],
      chapters: [
        { at: 0.5, end: 4, title: 'Create the game', subtitle: 'from plugin-chess/PLUGIN.mdl' },
        { at: 4, end: 7.5, title: 'Play 1. e4' },
        { at: 7.5, end: 11, title: 'Play 1... e5' },
        { at: 11, end: 14.9, title: 'Play 2. Nf3' },
      ],
      recording: {
        recordedAt: '2026-10-16T10:12:00.000Z',
        target: 'browser',
        git: {
          branch: 'main',
          commit: '19e18130b89c82e607506931a650c4d77f9aac4d',
          dirty: false,
          remote: 'https://github.com/dxos/dxos',
        },
        flow: 'packages/plugins/plugin-chess/autocue/play-the-opening.mjs',
        composer: { url: 'http://localhost:4173', environment: 'local' },
        edge: { url: 'https://dev.dxos.network', environment: 'dev' },
        mdl: 'packages/plugins/plugin-chess/PLUGIN.mdl test QA-1',
        app: 'composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`',
      },
      spec: {
        path: 'packages/plugins/plugin-chess/PLUGIN.mdl',
        test: 'QA-1',
        line: 120,
        lines: SPEC_LINES,
        steps: [
          { name: 'Create the game', start: 7, end: 9, chapter: 0 },
          { name: 'Play 1. e4', start: 10, end: 13, chapter: 1 },
          { name: 'Play 1... e5', start: 14, end: 16, chapter: 2 },
          { name: 'Play 2. Nf3', start: 17, end: 19, chapter: 3 },
          { name: 'Delete the game', start: 21, end: 22 },
        ],
      },
      prompt:
        'Check out `main` at commit `19e18130b` of https://github.com/dxos/dxos.\n\nThen cue the "Play the opening" autocue demo and run it end to end.',
    },
  ],
};
