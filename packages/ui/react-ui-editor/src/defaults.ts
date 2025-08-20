//
// Copyright 2024 DXOS.org
//

import { EditorView } from '@codemirror/view';

import { mx } from '@dxos/react-ui-theme';

import { type ThemeExtensionsOptions } from './extensions';
import { fontMono } from './styles';

/**
 * CodeMirror content width.
 * 40rem = 640px. Corresponds to initial plank width (Google docs, Stashpad, etc.)
 * 50rem = 800px. Maximum content width for solo mode.
 * NOTE: Max width - 4rem = 2rem left/right margin (or 2rem gutter plus 1rem left/right margin).
 */
export const editorWidth = '!mli-auto is-full max-is-[min(50rem,100%-4rem)]';

export const editorSlots: ThemeExtensionsOptions['slots'] = {
  scroll: {
    className: 'pbs-2',
  },
  content: {
    className: editorWidth,
  },
};

export const editorGutter = EditorView.theme({
  '.cm-gutters': {
    // NOTE: Color required to cover content if scrolling horizontally.
    // TODO(burdon): Non-transparent background clips the focus ring.
    background: 'var(--dx-baseSurface)',
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

// NOTE: Padding is added to the editor to account for the focus ring (since otherwise the CM gutter will clip it)
export const stackItemContentEditorClassNames = (role?: string) =>
  mx(
    'p-0.5 dx-focus-ring-inset attention-surface data-[toolbar=disabled]:pbs-2',
    role === 'section' ? '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-bs-24' : 'min-bs-0',
  );
