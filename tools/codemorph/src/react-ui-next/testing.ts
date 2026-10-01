//
// Copyright 2026 DXOS.org
//

import { expect } from 'vitest';

import { runTransform } from './runner.ts';
import { type Transform } from './transforms/index.ts';

/** Strips the leading newline and common indentation of a template literal fixture. */
export const code = (strings: TemplateStringsArray, ...values: unknown[]): string => {
  const text = String.raw({ raw: strings }, ...values)
    .replace(/^\n/, '')
    .replace(/\n\s*$/, '\n');
  const indent = Math.min(
    ...text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.match(/^ */)?.[0].length ?? 0),
  );
  return text
    .split('\n')
    .map((line) => line.slice(indent))
    .join('\n');
};

/** Runs `transform` on a fixture, checks a second run changes nothing, and returns the output and residue reasons. */
export const transformFixture = (transform: Transform, input: string, fileName = 'Fixture.tsx') => {
  const first = runTransform(transform, fileName, input);
  const second = runTransform(transform, fileName, first.text);
  expect(second.text, 'idempotent').toBe(first.text);
  return { output: first.text, residue: first.residue.map((item) => item.reason), counts: first.counts };
};
