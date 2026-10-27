//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { keepKnownObjectLinks, referencesPrompt, stripObjectLinks, toPlainSummary } from './SummaryText.ts';

const PRIYA = 'echo:///01PRIYA';
const HATCH = 'echo:///01HATCH';

describe('SummaryText', () => {
  test('stripObjectLinks keeps labels and leaves web links alone', ({ expect }) => {
    expect(stripObjectLinks(`[Priya](${PRIYA}) asked; see [docs](https://dxos.org).`)).toBe(
      'Priya asked; see [docs](https://dxos.org).',
    );
  });

  test('toPlainSummary drops object links and strong emphasis', ({ expect }) => {
    expect(toPlainSummary(`[Priya](${PRIYA}) would commit to **20 lb/week**.`)).toBe(
      'Priya would commit to 20 lb/week.',
    );
  });

  test('keepKnownObjectLinks unlinks URIs that were not offered', ({ expect }) => {
    const text = `[Priya](${PRIYA}) from [Hatch](${HATCH}) met [Bob](echo:///01INVENTED).`;
    expect(keepKnownObjectLinks(text, new Set([PRIYA, HATCH]))).toBe(
      `[Priya](${PRIYA}) from [Hatch](${HATCH}) met Bob.`,
    );
  });

  test('referencesPrompt lists each object with its URI', ({ expect }) => {
    expect(referencesPrompt([])).toBe('');
    const prompt = referencesPrompt([
      { label: 'Priya Shah', uri: PRIYA, kind: 'person', detail: 'Hatch Coffee' },
      { label: 'Hatch Coffee', uri: HATCH, kind: 'organization' },
    ]);
    expect(prompt).toContain(`- Priya Shah (person, Hatch Coffee): ${PRIYA}`);
    expect(prompt).toContain(`- Hatch Coffee (organization): ${HATCH}`);
  });
});
