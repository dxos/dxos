//
// Copyright 2026 DXOS.org
//

import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { createResolver } from '../analyzers/resolver.ts';
import { compareFiles } from './agreement.ts';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../..');
const FIXTURES = ['basics.ts', 'effect.ts'].map((name) =>
  relative(ROOT, fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))),
);

describe('type propagation agrees with tsc', () => {
  test('fixtures have no disagreements', { timeout: 120_000 }, () => {
    const { score, findings } = compareFiles(FIXTURES, { root: ROOT, resolve: createResolver(ROOT) });
    for (const finding of findings) {
      if (process.env.AGREEMENT_VERBOSE || finding.verdict === 'disagree') {
        console.log(
          `${finding.verdict.padEnd(9)} ${finding.path}:${finding.line} ${finding.name}\n  mine:   ${finding.mine}\n  theirs: ${finding.theirs}`,
        );
      }
    }
    console.log(score);
    expect(findings.filter((finding) => finding.verdict === 'disagree')).toEqual([]);
  });
});
