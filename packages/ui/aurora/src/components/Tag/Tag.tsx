//
// Copyright 2022 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { ChromaticPalette, MessageValence, NeutralPalette } from '@dxos/aurora-types';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type TagProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.span>> & {
  palette?: NeutralPalette | ChromaticPalette | MessageValence;
  asChild?: boolean;
};

export const Tag = forwardRef<HTMLSpanElement, TagProps>(({ asChild, palette, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const Root = asChild ? Slot : Primitive.span;
  return <Root {...props} className={tx('tag.root', 'tag', { palette }, classNames)} ref={forwardedRef} />;
});
