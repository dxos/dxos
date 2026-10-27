//
// Copyright 2026 DXOS.org
//

// Run with `node --test .agents/skills/showcase/scripts/showcase.test.mjs`.

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The presenter's own splitter, so the deck is checked against the parser Composer imports it with.
import { splitSlides } from '../../../../packages/plugins/plugin-presenter/src/markdown/split.ts';
import { buildSlides, parseArgv, renderDeck, renderShowcaseBlock, sanitizeSummary } from './showcase.mjs';

const root = new URL('../../../../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');

/** The arguments that produced `plugin-presenter/testing/showcase.md`, the fixture its tests import. */
const FIXTURE_ARGS = [
  '--title',
  'Showcase decks',
  '--summary',
  'summary.md',
  '--feature',
  'packages/plugins/plugin-presenter/PLUGIN.mdl#F-13',
  '--script',
  'packages/plugins/plugin-presenter/autocue/showcase.script.md',
  '--video',
  'https://assets.composer.space/demos/2026-10-09-plugin-markdown.mp4',
  '--caption',
  'Write and link',
  '--image',
  'https://media.dxos.network/dxos-logotype-blue.png',
  '--caption',
  'The DXOS logotype',
];

const SUMMARY = [
  '## Summary',
  '',
  'A pull request now ends with a showcase: a presentation of what it changed, imported into Composer as a deck.',
  '',
  '---',
  '',
  '**Sections:** UI',
  '**Linear:** none',
].join('\n');

const readFixtureInput = (file) => (file === 'summary.md' ? SUMMARY : read(file));

describe('sanitizeSummary', () => {
  test('keeps the prose and drops what would break the slide', () => {
    const summary = sanitizeSummary(
      ['## Summary', '', 'Effect.', '<!-- hidden -->', '---', 'More.', '```', '---', '```', '**Linear:** none'].join(
        '\n',
      ),
    );
    assert.equal(summary, ['Effect.', '', '***', 'More.', '```', '---', '```'].join('\n'));
  });

  test('takes only the Summary section of a whole PR body', () => {
    const body = ['## Summary', '', 'Effect.', '', '**Showcase:** summary only', '', '## Safety', '', '| a |'].join(
      '\n',
    );
    assert.equal(sanitizeSummary(body), 'Effect.');
  });
});

describe('buildSlides', () => {
  test('one markdown slide at minimum', () => {
    const slides = buildSlides({ title: 'Fix', pr: 'https://github.com/dxos/dxos/pull/42' });
    assert.deepEqual(slides, [
      "---\ntitle: 'Fix'\n---\n\n# Fix\n\n**Pull request:** [dxos/dxos/pull/42](https://github.com/dxos/dxos/pull/42)",
    ]);
  });

  test('a script with a video becomes a video slide with its narration as notes', () => {
    const [, video] = buildSlides({
      title: 'Chess',
      artifacts: [
        {
          kind: 'script',
          script: {
            title: 'Play the opening.',
            video: 'https://example.com/chess.mp4',
            steps: [
              { name: 'Enable Chess', narration: 'Enable Chess', setup: true },
              { name: 'Play 1. e4', narration: 'Drag a piece --> to move it.', setup: false },
            ],
          },
        },
      ],
    });
    assert.equal(
      video,
      [
        '---',
        '',
        "title: 'Play the opening.'",
        "backgroundVideo: 'https://example.com/chess.mp4'",
        '---',
        '',
        '[Play the opening.](https://example.com/chess.mp4)',
        '',
        '<!--',
        '- Drag a piece -> to move it.',
        '-->',
      ].join('\n'),
    );
  });

  test('the presenter splits the deck back into the same slides', () => {
    const slides = buildSlides(parseArgv(FIXTURE_ARGS, { readFile: readFixtureInput }));
    assert.deepEqual(splitSlides(renderDeck(slides)), slides);
  });

  test('matches the presenter fixture', () => {
    const deck = renderDeck(buildSlides(parseArgv(FIXTURE_ARGS, { readFile: readFixtureInput })));
    if (process.env.UPDATE_FIXTURE) {
      writeFileSync(new URL('packages/plugins/plugin-presenter/testing/showcase.md', root), deck);
    }
    assert.equal(deck, read('packages/plugins/plugin-presenter/testing/showcase.md'));
  });
});

describe('parseArgv', () => {
  test('a caption names the artifact before it', () => {
    const options = parseArgv(['--title', 'T', '--image', 'https://a/1.png', '--caption', 'One', '--video', 'v.mp4']);
    assert.deepEqual(options.artifacts, [
      { kind: 'image', url: 'https://a/1.png', caption: 'One' },
      { kind: 'video', url: 'v.mp4' },
    ]);
  });

  test('a caption with nothing before it is an error', () => {
    assert.throws(() => parseArgv(['--title', 'T', '--caption', 'One']), /--caption follows/);
  });
});

describe('renderShowcaseBlock', () => {
  test('cites the features and the first video', () => {
    assert.equal(
      renderShowcaseBlock({
        id: 'SC-1',
        title: 'Showcase decks',
        pr: 'https://github.com/dxos/dxos/pull/42',
        features: ['packages/plugins/plugin-presenter/PLUGIN.mdl#F-13'],
        artifacts: [{ kind: 'video', url: 'https://example.com/demo.mp4' }],
      }),
      [
        '```mdl',
        'showcase SC-1: Showcase decks',
        '  for: [F-13]',
        '  pr: https://github.com/dxos/dxos/pull/42',
        '  video: https://example.com/demo.mp4',
        '```',
      ].join('\n'),
    );
  });
});
