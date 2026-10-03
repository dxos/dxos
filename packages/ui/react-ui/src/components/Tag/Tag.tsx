//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';
import { type ThemedClassName } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks/useThemeContext.ts';

type TagProps = ThemedClassName<ComponentPropsWithRef<typeof ark.span>> & {
  asChild?: boolean;
  hue?: NeutralPalette | ChromaticPalette | MessageValence;
};

const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ asChild, hue = 'neutral', classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.span
        asChild={asChild}
        {...props}
        className={tx('tag.root', { hue }, classNames)}
        data-hue={hue}
        ref={forwardedRef}
      />
    );
  },
);

export { Tag as Root };
export type { TagProps as RootProps };
export * from './Tag.theme.ts';
