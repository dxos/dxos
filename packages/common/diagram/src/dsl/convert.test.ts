//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { BASIC, CLASS_DIAGRAM } from '../testing.ts';
import { UndetectedSourceError, UnknownSourceError, convert, detect } from './convert.ts';
import { parse } from './parse.ts';
import { printCommands } from './print.ts';

describe('convert', () => {
  test('detects a flowchart and a classDiagram', ({ expect }) => {
    expect(detect(BASIC.trim())?.id).toEqual('mermaid');
    expect(detect(CLASS_DIAGRAM.trim())?.id).toEqual('uml');
    expect(detect('not a diagram')).toBeUndefined();
  });

  for (const [name, source] of Object.entries({ BASIC, CLASS_DIAGRAM })) {
    test(`${name} converts to DSL that parses back cleanly`, async ({ expect }) => {
      const text = await Effect.runPromise(convert(source.trim()));
      const { commands, problems } = parse(text);
      expect(problems).toEqual([]);
      expect(commands.length).toBeGreaterThan(0);
      // Output is canonical, so converting and reprinting is a fixed point.
      expect(printCommands(commands)).toEqual(text);
    });
  }

  test('the emitted form is post-layout — every object carries an origin', async ({ expect }) => {
    const { commands } = parse(await Effect.runPromise(convert(BASIC.trim())));
    const upserts = commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
    expect(upserts.length).toBeGreaterThan(0);
    expect(upserts.every(({ origin }) => origin !== undefined)).toBe(true);
  });

  test('an explicit source overrides detection', async ({ expect }) => {
    const elk = await Effect.runPromise(convert(BASIC.trim()));
    const layered = await Effect.runPromise(convert(BASIC.trim(), { source: 'mermaid-layered' }));
    expect(parse(layered).problems).toEqual([]);
    // Same graph, different placement engine, so the text must differ.
    expect(layered).not.toEqual(elk);
  });

  test('an unusable input fails with a typed error rather than throwing', async ({ expect }) => {
    await expect(Effect.runPromise(convert('not a diagram'))).rejects.toThrow(UndetectedSourceError);
    await expect(Effect.runPromise(convert(BASIC.trim(), { source: 'd2' }))).rejects.toThrow(UnknownSourceError);
  });
});
