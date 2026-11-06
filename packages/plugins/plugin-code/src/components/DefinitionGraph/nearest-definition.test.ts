//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { nearestDefinition } from './nearest-definition.ts';

const block = (header: string) => `\`\`\`mdl\n${header}\n\`\`\``;

const TEXT = ['Intro prose.', block('type Project'), 'Between.', block('feat F-1: Build'), 'Outro.'].join('\n\n');

const known =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id);

describe('nearestDefinition', () => {
  test('the block the offset is in, else the closest one', ({ expect }) => {
    const all = known('Project', 'F-1');
    expect(nearestDefinition(TEXT, TEXT.indexOf('feat F-1'), all)).toBe('F-1');
    expect(nearestDefinition(TEXT, 0, all)).toBe('Project');
    expect(nearestDefinition(TEXT, TEXT.length, all)).toBe('F-1');
  });

  test('skips blocks that are not definitions', ({ expect }) => {
    expect(nearestDefinition(TEXT, TEXT.indexOf('feat F-1'), known('Project'))).toBe('Project');
    expect(nearestDefinition(TEXT, 0, known())).toBeUndefined();
  });
});
