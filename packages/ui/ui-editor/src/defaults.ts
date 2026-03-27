//
// Copyright 2024 DXOS.org
//

import { mx } from '@dxos/ui-theme';

import { type ThemeExtensionsOptions } from './extensions';

/**
 * CodeMirror content width.
 * 40rem = 640px. Corresponds to initial plank width (Google docs, Stashpad, etc.)
 * 50rem = 800px. Maximum content width for solo mode.
 * NOTE: Max width - 4rem = 2rem left/right margin (or 2rem gutter plus 1rem left/right margin).
 */
const editorWidth =
  'mx-auto! w-full pointer-fine:max-w-[min(50rem,100%-4rem)] pointer-coarse:max-w-[min(50rem,100%-2rem)]';

export const editorSlots: ThemeExtensionsOptions['slots'] = {
  content: {
    className: editorWidth,
  },
};

// NOTE: Padding is added to the editor to account for the focus ring (since otherwise the CM gutter will clip it)
export const stackItemContentEditorClassNames = (role?: string) =>
  mx(
    'dx-attention-surface p-0.5 dx-focus-ring-inset data-[toolbar=disabled]:pt-2',
    role === 'section' ? '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-h-24' : 'dx-container overflow-hidden',
  );
