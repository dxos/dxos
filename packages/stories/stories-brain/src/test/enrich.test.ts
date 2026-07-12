//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { buildEnrichPrompt, parseEnrichResponse } from '../testing/harness';

// Deterministic coverage for the single-pass enrichment prompt + parser — no fixture / model required
// (the model-graded quality/latency comparison lives in the bench).

describe('buildEnrichPrompt', () => {
  test('asks for a full bullet summary for person mail', () => {
    const prompt = buildEnrichPrompt('summary');
    expect(prompt).toContain('bullet list');
    expect(prompt).toContain('"tags"');
    expect(prompt).toContain('"facts"');
  });

  test('asks for a one-line label for org / bulk mail', () => {
    const prompt = buildEnrichPrompt('label');
    expect(prompt).toContain('ONE short line');
    expect(prompt).not.toContain('bullet list');
  });
});

describe('parseEnrichResponse', () => {
  test('parses a clean JSON object', () => {
    const result = parseEnrichResponse(
      '{"tags":["Invoice","Finance"],"spam":false,"summary":"Invoice from Acme","facts":["Due 2026-02-01","$42.00"]}',
      'label',
    );
    expect(result.tags).toEqual(['invoice', 'finance']); // Lowercased.
    expect(result.spam).toBe(false);
    expect(result.summary).toBe('Invoice from Acme');
    expect(result.summaryKind).toBe('label');
    expect(result.facts).toEqual(['Due 2026-02-01', '$42.00']);
  });

  test('extracts JSON wrapped in prose / fences (local models)', () => {
    const raw = 'Sure! Here is the analysis:\n```json\n{"tags":["personal"],"summary":"- Confirms lunch"}\n```';
    const result = parseEnrichResponse(raw, 'summary');
    expect(result.tags).toEqual(['personal']);
    expect(result.summary).toBe('- Confirms lunch');
    expect(result.facts).toEqual([]); // Missing → empty.
  });

  test('infers spam from a spam tag and dedups it', () => {
    const result = parseEnrichResponse('{"tags":["spam","marketing"],"summary":"x"}', 'label');
    expect(result.spam).toBe(true);
    expect(result.tags.filter((tag) => tag === 'spam')).toHaveLength(1);
  });

  test('adds the spam tag when the flag is set but the tag is missing', () => {
    const result = parseEnrichResponse('{"tags":["promo"],"spam":true,"summary":"x"}', 'label');
    expect(result.spam).toBe(true);
    expect(result.tags).toContain('spam');
  });

  test('degrades to empty on unparseable output', () => {
    const result = parseEnrichResponse('the model refused', 'summary');
    expect(result.tags).toEqual([]);
    expect(result.spam).toBe(false);
    expect(result.summary).toBe('');
    expect(result.facts).toEqual([]);
  });
});
