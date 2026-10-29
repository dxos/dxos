//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Presentation } from '#types';

import { getPresentationPath, getPresentingPath, isPresenting } from './paths.ts';

describe('paths', () => {
  test('a presentation goes fullscreen in place', ({ expect }) => {
    const presentation = Presentation.make();
    const plank = `root/space/${presentation.id}`;
    expect(getPresentingPath(plank, presentation)).toBe(plank);
    expect(isPresenting({ fullscreen: plank }, presentation)).toBe(true);
    expect(isPresenting({ fullscreen: getPresentationPath(plank) }, presentation)).toBe(false);
    expect(isPresenting({}, presentation)).toBe(false);
  });

  test('a document is presented through its companion', ({ expect }) => {
    const document = Markdown.make({ content: '# Doc' });
    const plank = `root/space/${document.id}`;
    expect(getPresentingPath(plank, document)).toBe(getPresentationPath(plank));
    expect(isPresenting({ fullscreen: getPresentationPath(plank) }, document)).toBe(true);
    expect(isPresenting({ fullscreen: plank }, document)).toBe(false);
  });
});
