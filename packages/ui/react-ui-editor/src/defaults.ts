//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { mx } from '@dxos/react-ui-theme';

import { fontMono } from './styles';

const margin = '!mt-[1rem]';

/**
 * CodeMirror content width.
 * 40rem = 640px. Corresponds to initial plank width (Google docs, Stashpad, etc.)
 * 50rem = 800px. Maximum content width for solo mode.
 * NOTE: Max width - 4rem = 2rem left/right margin (or 2rem gutter plus 1rem left/right margin).
 */
// TOOD(burdon): Adjust depending on
export const editorContent = mx(margin, '!mli-auto w-full max-w-[min(50rem,100%-4rem)]');

/**
 * Margin for numbers.
 */
export const editorFullWidth = mx(margin);

export const editorGutter = EditorView.theme({
  // Match margin from content.
  // Gutter = 2rem + 1rem margin.
  '.cm-gutters': {
    marginTop: '1rem',
    paddingRight: '1rem',
  },
});

export const editorMonospace = EditorView.theme({
  '.cm-content': {
    fontFamily: fontMono,
  },
});

export const editorWithToolbarLayout =
  'grid grid-cols-1 grid-rows-[min-content_1fr] data-[toolbar=disabled]:grid-rows-[1fr] justify-center content-start overflow-hidden';
