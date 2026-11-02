//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as FeatureEmbed from './FeatureEmbed.ts';

const A = '01J00000000000000000000000';
const B = '01J00000000000000000000001';
const embed = (id: string, label = 'Sync') => `![${label}](echo:///${id})`;

describe('FeatureEmbed', () => {
  test('parse finds object embeds in order and skips plain links', ({ expect }) => {
    const text = `Prose with a [link](echo:///${B}).\n\n${embed(A)}\n\n${embed(B, 'Compose')}\n`;
    expect(FeatureEmbed.parse(text).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: A, label: 'Sync' },
      { id: B, label: 'Compose' },
    ]);
  });

  test('append adds to the end of the Features section, else to the end of the text, as a paragraph', ({ expect }) => {
    const sectioned = `# Spec\n\n## Features\n\n${embed(A)}\n\n## Changelog\n\nNotes.\n`;
    expect(FeatureEmbed.apply(sectioned, [FeatureEmbed.append(sectioned, embed(B))])).toBe(
      `# Spec\n\n## Features\n\n${embed(A)}\n\n${embed(B)}\n\n## Changelog\n\nNotes.\n`,
    );
    const loose = 'A wall of text about mail.';
    expect(FeatureEmbed.apply(loose, [FeatureEmbed.append(loose, embed(A))])).toBe(
      `A wall of text about mail.\n\n${embed(A)}\n`,
    );
  });

  test('remove takes a line that holds only the embed, and leaves the rest of a shared line', ({ expect }) => {
    const text = `Before\n${embed(A)}\nSee ${embed(A)} here.\nAfter\n`;
    expect(FeatureEmbed.apply(text, FeatureEmbed.remove(text, A))).toBe('Before\nSee  here.\nAfter\n');
  });

  test('relabel rewrites only the labels that differ, and make never writes an empty label', ({ expect }) => {
    const text = `${embed(A, 'Old')}\n${embed(B, 'Other')}\n`;
    expect(FeatureEmbed.apply(text, FeatureEmbed.relabel(text, A, 'New [draft]'))).toBe(
      `${embed(A, 'New draft')}\n${embed(B, 'Other')}\n`,
    );
    expect(FeatureEmbed.make({ label: ' ', uri: `echo:///${A}` })).toBe(embed(A, 'feature'));
  });
});
