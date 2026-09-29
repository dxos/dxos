//
// Copyright 2026 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type TagHue = NeutralPalette | ChromaticPalette | MessageValence;

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  /** Maps to ui-theme's `--color-<hue>-surface`/`-fg` tokens; valences use the same hues as the current `Tag`. */
  hue?: TagHue;
};

/** A small pill one inset shorter than a control, so it sits inside a control or a block row. */
export const Tag = composable<HTMLSpanElement, TagProps>(({ hue = 'neutral', children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.tag() });
  return (
    <span {...rest} data-hue={hue} data-scope='tag' data-part='root' className={className} ref={forwardedRef}>
      {children}
    </span>
  );
});

Tag.displayName = 'Next.Tag';
