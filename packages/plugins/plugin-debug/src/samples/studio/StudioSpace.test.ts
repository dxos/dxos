//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import { STUDIO_SLIDES } from './deck.ts';
import * as StudioSpace from './StudioSpace.ts';

describe('DXOS Deck template', () => {
  test('builds a drawing per slide and a deck that embeds each', { timeout: 120_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(StudioSpace.make()));
    const { deck, drawings } = result.studio;
    expect(drawings.map((drawing) => drawing.name)).toEqual(STUDIO_SLIDES.map(({ title }) => title));
    expect(deck.slides).toHaveLength(STUDIO_SLIDES.length);

    const archive: { objects: Array<{ content?: unknown }> } = JSON.parse(json);
    const slides = archive.objects.flatMap(({ content }) =>
      typeof content === 'string' && content.includes('<Surface ref=') ? [content] : [],
    );
    expect(slides).toHaveLength(STUDIO_SLIDES.length);
    // Each slide embeds its own drawing, by a reference that resolves in whatever space the template seeds.
    for (const drawing of drawings) {
      expect(slides.filter((content) => content.includes(drawing.id))).toHaveLength(1);
    }
  });
});
