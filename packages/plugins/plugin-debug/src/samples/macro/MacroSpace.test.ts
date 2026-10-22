//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as MacroSpace from './MacroSpace.ts';

describe('Macro template', () => {
  test('builds the events sheet, its timeline chart and the deck', { timeout: 120_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(MacroSpace.make()));
    const archive: { objects: Array<{ '@type'?: string; 'type'?: string; 'content'?: string }> } = JSON.parse(json);

    const charts = archive.objects.filter((object) => object['@type']?.includes('org.dxos.type.chart'));
    expect(charts.map((chart) => chart.type)).toEqual(['timeline']);

    // The deck's text: the table of complexes on the first slide, the chart embedded in the second.
    const { chart } = result.macro;
    const deck = archive.objects.find((object) => object.content?.includes('# The three complexes'))?.content ?? '';
    for (const complex of ['Financial (FIC)', 'Military (MIC)', 'Technology (TIC)']) {
      expect(deck).toContain(complex);
    }
    expect(deck).not.toContain('{{timeline}}');
    expect(deck.split('\n---\n')).toHaveLength(2);
    expect(deck).toContain(`(echo:///${chart.id})`);
  });
});
