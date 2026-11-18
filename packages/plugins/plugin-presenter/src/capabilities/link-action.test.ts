//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Presentation } from '#types';

import { present } from './link-action.ts';

describe('present link action', () => {
  test('public links to a presentation carry it; documents and internal links do not', ({ expect }) => {
    expect(present.links).toEqual(['public']);
    expect(present.appliesTo(Presentation.make())).toBe(true);
    expect(present.appliesTo(Markdown.make({ content: '# Doc' }))).toBe(false);
  });
});
