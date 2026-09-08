//
// Copyright 2025 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type TagProps = ThemedClassName<ComponentPropsWithRef<typeof ark.span>> & {
  asChild?: boolean;
  hue?: NeutralPalette | ChromaticPalette | MessageValence;
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
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
