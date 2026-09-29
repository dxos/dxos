//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MermaidEngine, type Scene } from '@dxos/diagram';

import { scoreScene } from './score-scene.ts';

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

describe('scoreScene', () => {
  test('scores a laid-out flowchart on the objective, constraints first', async ({ expect }) => {
    const objects = objectsOf(await MermaidEngine.compile('flowchart TB\n  A --> B\n  B --> C'));
    const { overall, scores, diagnostics } = scoreScene(objects);
    expect(scores.slice(0, 2).map(({ kind }) => kind)).toEqual(['constraint', 'constraint']);
    expect(scores.every(({ score }) => score >= 0 && score <= 1)).toBe(true);
    expect(overall).toBeGreaterThan(0);
    expect(diagnostics.filter(({ severity }) => severity === 'error')).toEqual([]);
  });

  test('an empty scene has nothing to fault, so it still scores', ({ expect }) => {
    expect(scoreScene([]).overall).toBeDefined();
  });
});
