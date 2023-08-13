//
// Copyright 2022 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

export type ToolbarProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {};

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const Root = Primitive.div;
  return (
    <Root
      {...props}
      className={tx('toolbar.root', 'toolbar', {}, 'flex w-full items-center whitespace-nowrap', classNames)}
      ref={forwardedRef}
    />
  );
});
