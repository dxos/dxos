//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { describe, test } from 'vitest';

import { frameWithChildren, groupAndRotation, shapesAndArrow, textNoteAndFreeArrow, twoPages } from './testing.ts';
import { tldrawToLayout } from './tldraw.ts';

// Outputs recorded from the View-based mapper this replaced, so the direct mapping is held to the same elements.
const CASES = {
  'shapes-and-arrow': () => tldrawToLayout(shapesAndArrow()),
  'shapes-and-arrow-free': () => tldrawToLayout(shapesAndArrow(), { snap: false }),
  'text-note-and-free-arrow': () => tldrawToLayout(textNoteAndFreeArrow()),
  'text-note-and-free-arrow-free': () => tldrawToLayout(textNoteAndFreeArrow(), { snap: false }),
  'frame-with-children': () => tldrawToLayout(frameWithChildren()),
  'frame-with-children-free': () => tldrawToLayout(frameWithChildren(), { snap: false }),
  'group-and-rotation': () => tldrawToLayout(groupAndRotation()),
  'group-and-rotation-free': () => tldrawToLayout(groupAndRotation(), { snap: false }),
  'two-pages': () => tldrawToLayout(twoPages(), { root: 'main', snap: false }),
};

const golden = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./golden/${name}.json`, import.meta.url), 'utf8'));

describe('tldrawToLayout golden', () => {
  for (const [name, run] of Object.entries(CASES)) {
    test(name, ({ expect }) => {
      expect(JSON.parse(JSON.stringify(run()))).toEqual(golden(name));
    });
  }
});
