//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SOFTWARE_DIALECT, resolveBlockSchemas } from './dialects.ts';
import { isNumberedId, labelsByKey, mintKey, rekey, specItems } from './keys.ts';
import { applyChanges } from './text.ts';

const fence = (...lines: string[]) => ['```mdl', ...lines, '```'].join('\n');

const SPEC = [
  '---',
  'id: org.example.spec',
  '---',
  '',
  fence('feat F-1: Retention', '  req F-1.1: Old entries are dropped.', '  req F-1.2: Retention is per feed.'),
  '',
  fence('feat F-2: Trim', '  needs: [F-1]', '  req F-2.1: Trimming keeps the newest entry.'),
  '',
  'Trimming builds on org.example.spec#F-1.2.',
  '',
].join('\n');

const schemas = resolveBlockSchemas('', { dialects: [SOFTWARE_DIALECT] });

/** A deterministic source of randomness, so keys are predictable. */
const sequence = () => {
  let seed = 7;
  return () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
};

describe('keys', () => {
  test('a minted key starts with a letter, avoids look-alikes and is not taken', ({ expect }) => {
    const key = mintKey(new Set(), sequence());
    expect(key).toMatch(/^[a-z][a-z2-9]{4}$/);
    expect(key).not.toMatch(/[lo01]/);
    expect(mintKey(new Set([key]), sequence())).not.toBe(key);
  });

  test('positional ids are recognised by their prefix', ({ expect }) => {
    expect(isNumberedId('F-3', 'F')).toBe(true);
    expect(isNumberedId('F-3.2', 'F')).toBe(true);
    expect(isNumberedId('retention', 'F')).toBe(false);
  });

  test('labels follow document order, whatever the keys', ({ expect }) => {
    const text = SPEC.replace('feat F-1', 'feat zzzzz').replace('feat F-2', 'feat aaaaa');
    const labels = labelsByKey(specItems(text, schemas));
    expect(labels.get('zzzzz')).toBe('F-1');
    expect(labels.get('aaaaa')).toBe('F-2');
    expect(labels.get('F-2.1')).toBe('F-2.1');
  });
});

describe('rekey', () => {
  test('replaces positional ids with keys and rewrites references and citations to them', ({ expect }) => {
    const { changes, keys } = rekey(SPEC, schemas, { random: sequence(), specId: 'org.example.spec' });
    const out = applyChanges(SPEC, changes);
    expect([...keys.keys()]).toEqual(['F-1', 'F-1.1', 'F-1.2', 'F-2', 'F-2.1']);
    expect(out).toContain(`feat ${keys.get('F-1')}: Retention`);
    expect(out).toContain(`  req ${keys.get('F-1.2')}: Retention is per feed.`);
    expect(out).toContain(`  needs: [${keys.get('F-1')}]`);
    expect(out).toContain(`org.example.spec#${keys.get('F-1.2')}.`);
    expect(out).not.toMatch(/F-\d/);
    expect(labelsByKey(specItems(out, schemas)).get(keys.get('F-2.1')!)).toBe('F-2.1');
  });

  test('keeps keys and named ids, and re-mints a duplicate', ({ expect }) => {
    const text = [fence('feat abcde: One'), fence('feat retention: Two'), fence('feat abcde: Copy')].join('\n\n');
    const out = applyChanges(text, rekey(text, schemas, { random: sequence() }).changes);
    expect(out).toContain('feat abcde: One');
    expect(out).toContain('feat retention: Two');
    expect(out).not.toContain('feat abcde: Copy');
  });

  test('gives a block with no id a key', ({ expect }) => {
    const out = applyChanges(
      fence('feat: Untitled'),
      rekey(fence('feat: Untitled'), schemas, { random: sequence() }).changes,
    );
    expect(out).toMatch(/^```mdl\nfeat [a-z][a-z2-9]{4}: Untitled\n```$/);
  });
});
