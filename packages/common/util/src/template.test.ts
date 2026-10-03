//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseTemplatePlaceholder, renderTemplate } from './template.ts';

describe('template', () => {
  test('parseTemplatePlaceholder matches only a whole-value placeholder', ({ expect }) => {
    expect(parseTemplatePlaceholder('{{event.item}}')).toBe('event.item');
    expect(parseTemplatePlaceholder('item: {{event.item}}')).toBeUndefined();
    expect(parseTemplatePlaceholder('{{first}} {{last}}')).toBeUndefined();
    expect(parseTemplatePlaceholder('plain')).toBeUndefined();
  });

  test('renderTemplate interpolates scalars and blanks everything else', ({ expect }) => {
    const values: Record<string, unknown> = { first: 'Ada', count: 3, flag: true, nested: { a: 1 } };
    const resolve = (path: string) => values[path];
    expect(renderTemplate('{{first}} ({{count}}, {{flag}})', resolve)).toBe('Ada (3, true)');
    expect(renderTemplate('{{ first }}-{{missing}}-{{nested}}', resolve)).toBe('Ada--');
  });
});
