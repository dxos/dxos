//
// Copyright 2026 DXOS.org
//

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { describe, test } from 'vitest';

import { analyze, errors } from './diagnostics';
import * as MermaidEngine from './mermaid-engine';
import type * as Scene from './scene';

//
// Tier 1 over the committed diagram corpus (`docs/diagrams/*.mmd`): every diagram must render
// with no hard defects, its soft metrics are golden-filed, and every `%% ref` must name a path
// that exists in the repository — a diagram of the code should not drift from the code.
//

const DIAGRAMS = join(__dirname, '../../docs/diagrams');
const REPO = join(__dirname, '../../../../..');

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const corpus = readdirSync(DIAGRAMS)
  .filter((file) => file.endsWith('.mmd'))
  .sort()
  .map((file) => [basename(file, '.mmd'), readFileSync(join(DIAGRAMS, file), 'utf8')] as const);

describe.each(corpus)('corpus: %s', (_name, source) => {
  test('renders with no hard defects', async ({ expect }) => {
    const report = analyze(objectsOf(await MermaidEngine.compile(source)));

    expect(errors(report).map(({ message }) => message)).toEqual([]);
    expect(report.metrics.nodes).toBeGreaterThan(0);
  });

  test('soft metrics', async ({ expect }) => {
    const { crossings, bends } = analyze(objectsOf(await MermaidEngine.compile(source))).metrics;

    expect({ crossings, bends }).toMatchSnapshot();
  });

  test('every ref names a path in this repository or a URL', async ({ expect }) => {
    const objects = objectsOf(await MermaidEngine.compile(source));
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
