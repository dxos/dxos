//
// Copyright 2026 DXOS.org
//

import { tv } from '@dxos/ui-theme';

/**
 * Theme for {@link FormFieldLabel}: a `root` slot (the label row container) and a `text` slot (the inner
 * label text node), varying with the Form `variant`. Owned by the label subcomponent rather than reached
 * into by the parent field wrapper.
 */
export const labelTheme = tv({
  slots: {
    root: 'grid grid-cols-[1fr_auto_auto] items-center select-none',
    text: '',
  },
  variants: {
    variant: {
      default: {},
      settings: {
        root: '[grid-area:header]',
        text: 'pb-trim-md text-base-fg text-lg',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});
