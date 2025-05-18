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
export const editorWidth = '!mli-auto is-full max-is-[min(50rem,100%-4rem)]';

export const editorContent = mx(margin, editorWidth);

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

export const stackItemContentEditorClassNames = (role?: string) =>
  mx(
    'attention-surface dx-focus-ring-inset data-[toolbar=disabled]:pbs-2',
    role === 'section' ? '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-bs-24' : 'min-bs-0',
  );

export const stackItemContentToolbarClassNames = (role?: string) =>
  mx(
    'relative z-[1] flex is-full bg-toolbarSurface border-be border-separator',
    role === 'section' && 'sticky block-start-0 -mbe-px min-is-0',
  );
