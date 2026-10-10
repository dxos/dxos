//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';

import compiled from './compiled.json?raw';
import { CompiledDiagrams } from './compiled.ts';
import { DIAGRAM_SOURCES } from './sources.ts';

describe('compiled diagrams', () => {
  // Set `DX_UPDATE_DIAGRAMS=1` after editing a `.dx` source to rewrite `compiled.json`.
  test('match their sources', { timeout: 120_000 }, async ({ expect }) => {
    const commands: Record<string, unknown> = {};
    for (const [id, source] of Object.entries(DIAGRAM_SOURCES)) {
      commands[id] = (await EffectEx.runPromise(Dsl.compile(source))).commands;
    }
    const encoded = Schema.encodeSync(CompiledDiagrams)(Schema.decodeUnknownSync(CompiledDiagrams)(commands));
    if (process.env.DX_UPDATE_DIAGRAMS) {
      writeFileSync(join(import.meta.dirname, 'compiled.json'), `${JSON.stringify(encoded)}\n`);
      return;
    }
    expect(encoded).toEqual(JSON.parse(compiled));
  });
});
