//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { DIAGRAMS, SLIDES, diagramTitle } from '../cloudflare/deck.ts';
import * as ArchitectureSpace from './ArchitectureSpace.ts';

describe('DXOS Architecture template', () => {
  test('builds a drawing per diagram and a deck whose slides embed them', { timeout: 120_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(ArchitectureSpace.make()));
    const { deck, drawings } = result.studio;
    expect([...drawings.keys()]).toEqual(DIAGRAMS.map(({ id }) => id));
    expect([...drawings].map(([id, drawing]) => [id, drawing.name])).toEqual(
      DIAGRAMS.map(({ id }) => [id, diagramTitle(id)]),
    );
    expect(deck.slides).toHaveLength(SLIDES.length);

    const archive: { objects: Array<{ content?: unknown }> } = JSON.parse(json);
    const texts = archive.objects.flatMap(({ content }) => (typeof content === 'string' ? [content] : []));
    // Every placeholder was replaced, and each drawing is embedded once, by a reference that resolves in whatever
    // space the template seeds.
    expect(texts.filter((content) => content.includes('{{'))).toEqual([]);
    for (const drawing of drawings.values()) {
      expect(texts.filter((content) => content.includes(drawing.id))).toHaveLength(1);
    }
  });
});
