//
// Copyright 2026 DXOS.org
//

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { beforeAll, describe, test } from 'vitest';

import { analyze, errors } from './diagnostics';
import * as MermaidEngine from './mermaid-engine';
import type * as Scene from './scene';

//
// Tier 1 over the committed diagram corpus (`docs/diagrams/*.mmd`): every diagram must render
// with no hard defects, its soft metrics are golden-filed, and every `%% ref` must name a path
// that exists in the repository — a diagram of the code should not drift from the code.
//
// Tagged manual, so it does not run in CI. The ELK candidate sweep is ~170s of the package's ~185s
// on a 4-core sandbox and exceeds ten minutes on CI hardware even with every other task cached,
// which is the task timeout: the suite failed its shard deterministically rather than flakily.
// Run it directly, and before changing anything about layout or the corpus:
//
//   DX_RUN_MANUAL_TESTS=1 moon run plugin-illustrator:test -- src/model/corpus.test.ts
//
// TODO(burdon): Make the sweep affordable in CI — memoize the layout per diagram hash, or sample
// the corpus — and drop the gate. Skipping it means corpus drift is caught only when run by hand.
//

const DIAGRAMS = join(__dirname, '../../docs/diagrams');
const REPO = join(__dirname, '../../../../..');

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const corpus = readdirSync(DIAGRAMS)
  .filter((file) => file.endsWith('.mmd'))
  .sort()
  .map((file) => [basename(file, '.mmd'), readFileSync(join(DIAGRAMS, file), 'utf8')] as const);

// eslint-disable-next-line no-restricted-syntax -- the gate is the point; see the note above.
const MANUAL = !!process.env.DX_RUN_MANUAL_TESTS;

describe.skipIf(!MANUAL).each(corpus)('corpus: %s', (_name, source) => {
  // One search per diagram: the candidate sweep is seconds of ELK and the tests only read its result.
  let objects: Scene.WorldObject[];
  beforeAll(async () => {
    objects = objectsOf(await MermaidEngine.compile(source));
  }, 300_000);

  test('renders with no hard defects', ({ expect }) => {
    const report = analyze(objects);

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.nodes).toBeGreaterThan(0);
  });

  test('soft metrics', ({ expect }) => {
    const { crossings, bends } = analyze(objects).metrics;

    expect({ crossings, bends }).toMatchSnapshot();
  });

  test('every ref names a path in this repository or a URL', ({ expect }) => {
    const refs = objects.flatMap((object) => (object.ref ? [[object.id, object.ref] as const] : []));

    expect(refs.length).toBeGreaterThan(0);
    for (const [id, ref] of refs) {
      // A path must resolve inside the repository — `../` out of it would pass `existsSync` alone.
      const target = resolve(REPO, ref);
      const inRepo = target.startsWith(resolve(REPO) + sep) && existsSync(target);
      expect(/^[a-z]+:\/\//.test(ref) || inRepo, `${id} → ${ref}`).toBe(true);
    }
  });
});
