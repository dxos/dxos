//
// Copyright 2024 DXOS.org
//

import { mx } from '@dxos/ui-theme';

import { type ThemeExtensionsOptions } from './extensions';

// NOTE: Padding is added to the editor to account for the focus ring (since otherwise the CM gutter will clip it)
export const editorClassNames = (role?: string) =>
  mx(
    'dx-attention-surface p-0.5 data-[toolbar=disabled]:pt-2 dx-focus-ring-inset',
    role === 'section' ? '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-h-24' : 'dx-container overflow-hidden',
  );

export const documentSlots: ThemeExtensionsOptions['slots'] = {
  content: {
    /**
     * CodeMirror content width.
     * 40rem = 640px. Corresponds to initial plank width (Google docs, Stashpad, etc.)
     * 50rem = 800px. Maximum content width for solo mode.
     * NOTE: Max width - 4rem = 2rem left/right margin (or 2rem gutter plus 1rem left/right margin).
     */
    className: 'mx-auto! w-full pointer-fine:max-w-[min(50rem,100%-4rem)] pointer-coarse:max-w-[min(50rem,100%-2rem)]',
  },
  scroll: {
    // NOTE: Child widgets must have `max-w-[100cqi]`.
    className: 'dx-size-container',
  },
};

export const compactSlots: ThemeExtensionsOptions['slots'] = {
  content: {
    className: 'mx-2! w-full',
  },
};
