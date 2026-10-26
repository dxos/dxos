//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Diagnostics, Dsl } from '@dxos/diagram';

import { semanticDiagrams } from './DrawingSkill.ts';

/** The fenced examples in the skill text, which an agent copies, so each must draw cleanly. */
const examples = [...semanticDiagrams.matchAll(/```\n([\s\S]*?)\n\s*```/g)].map((match) => match[1]);

describe('DrawingSkill', () => {
  test('has an example for each diagram kind', ({ expect }) => {
    expect(examples.some((example) => example.includes('kind=sequence'))).toBe(true);
    expect(examples.some((example) => example.includes('kind=dataflow'))).toBe(true);
  });

  test.each(examples.map((example) => [example.split('\n')[0], example]))('%s draws cleanly', (_name, example) => {
    const { commands, problems } = Dsl.parse(example);
    // An example that teaches the data-flow checks may show what they warn about; none here should.
    if (problems.length > 0) {
      throw new Error(problems.map(({ message }) => message).join('\n'));
    }
    const report = Diagnostics.analyze(Dsl.toScene(commands).objects);
    if (Diagnostics.errors(report).length > 0) {
      throw new Error(
        Diagnostics.errors(report)
          .map(({ message }) => message)
          .join('\n'),
      );
    }
  });
});
