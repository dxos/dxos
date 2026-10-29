//
// Copyright 2026 DXOS.org
//

// Run with `node --test .agents/skills/autocue/scripts/script.test.mjs`.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import { flowFromOps, parseFlowHeader, parseScript, renderScript, scriptFromFlow } from './script.mjs';

describe('parseFlowHeader', () => {
  test('reads the first sentence and the provenance tags', () => {
    const source = [
      '/**',
      ' * Start a chess game and play the opening.',
      ' *',
      ' * @mdl packages/plugins/plugin-chess/PLUGIN.mdl test QA-1',
      ' * @app composer-app via `moon run composer-app:serve` on :5173',
      ' */',
    ].join('\n');
    assert.deepEqual(parseFlowHeader(source), {
      title: 'Start a chess game and play the opening.',
      mdl: 'packages/plugins/plugin-chess/PLUGIN.mdl test QA-1',
      app: 'composer-app via `moon run composer-app:serve` on :5173',
    });
  });
  test('joins a first sentence that wraps across comment lines', () => {
    const source = [
      '/**',
      ' * A feature shows the tests that cite it; a feature with no key',
      ' * offers to set one.',
      ' *',
      ' * @mdl spec/X.mdl test QA-1',
      ' */',
    ].join('\n');
    assert.equal(
      parseFlowHeader(source).title,
      'A feature shows the tests that cite it; a feature with no key offers to set one.',
    );
  });
});

describe('script round trip', () => {
  const script = {
    title: 'Play the opening.',
    flow: 'packages/plugins/plugin-chess/autocue/play-the-opening.mjs',
    mdl: 'packages/plugins/plugin-chess/PLUGIN.mdl test QA-1',
    video: 'https://assets.composer.space/demos/chess.mp4',
    steps: [
      { name: 'Enable Chess', setup: true },
      { name: 'Create a game', narration: 'A new game opens on its own plank.' },
      { name: 'Play 1. e4' },
    ],
  };

  test('renders setup and on-camera steps separately', () => {
    const markdown = renderScript(script);
    assert.match(markdown, /^---\nflow: 'packages\/plugins\/plugin-chess\/autocue\/play-the-opening.mjs'\n/);
    assert.match(markdown, /## Setup\n\n1\. Enable Chess\n/);
    assert.match(
      markdown,
      /## Steps\n\n1\. Create a game\n\n {3}A new game opens on its own plank\.\n2\. Play 1\. e4\n/,
    );
  });

  test('parses what it renders', () => {
    const parsed = parseScript(renderScript(script));
    assert.equal(parsed.title, 'Play the opening.');
    assert.equal(parsed.video, script.video);
    assert.deepEqual(parsed.steps, [
      { name: 'Enable Chess', narration: 'Enable Chess', setup: true },
      { name: 'Create a game', narration: 'A new game opens on its own plank.', setup: false },
      { name: 'Play 1. e4', narration: 'Play 1. e4', setup: false },
    ]);
  });
});

describe('flowFromOps', () => {
  const ops = [
    { op: 'goto' },
    { op: 'status' },
    { op: 'caption', value: 'Step 1 — Create a game', subtitle: 'from plugin-chess/PLUGIN.mdl' },
    { op: 'click', selector: '[data-testid="create"]', label: 'Create' },
    { op: 'screenshot', name: 'probe.png' },
    { op: 'caption', value: 'Step 2 — Play 1. e4' },
    { op: 'drag', from: 'e2', to: 'e4' },
  ];

  test('splits steps at captions and drops driver-only ops', async () => {
    const source = flowFromOps({ title: 'Play the opening.', mdl: 'plugin-chess QA-1', ops });
    assert.doesNotMatch(source, /status|screenshot/);
    const dir = mkdtempSync(path.join(tmpdir(), 'autocue-script-'));
    const file = path.join(dir, 'flow.mjs');
    writeFileSync(file, source);

    const calls = [];
    const demo = new Proxy({}, { get: (_, op) => async (args) => calls.push({ op, ...args }) });
    const { steps } = await import(file);
    assert.deepEqual(
      steps.map(({ name, setup, narration }) => ({ name, setup, narration })),
      [
        { name: 'Set up', setup: true, narration: undefined },
        { name: 'Create a game', setup: undefined, narration: 'Step 1 — Create a game' },
        { name: 'Play 1. e4', setup: undefined, narration: 'Step 2 — Play 1. e4' },
      ],
    );
    for (const step of steps) {
      await step.run({ demo });
    }
    assert.deepEqual(
      calls.map(({ op }) => op),
      ['goto', 'caption', 'click', 'caption', 'drag'],
    );

    const script = await scriptFromFlow(file);
    assert.equal(script.title, 'Play the opening.');
    assert.equal(script.mdl, 'plugin-chess QA-1');
    assert.equal(script.steps.filter((step) => !step.setup).length, 2);
  });
});
