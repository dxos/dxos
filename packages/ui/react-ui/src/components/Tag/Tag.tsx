//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ChromaticPalette, type MessageValence, type NeutralPalette } from '@dxos/react-ui-types';

import { useThemeContext } from '../../hooks';

export type TagProps = ComponentPropsWithRef<typeof Primitive.span> & {
  palette?: NeutralPalette | ChromaticPalette | MessageValence;
  asChild?: boolean;
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ asChild, palette = 'neutral', className, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.span;
    return <Root {...props} className={tx('tag.root', 'dx-tag', className)} data-hue={palette} ref={forwardedRef} />;
  },
);
