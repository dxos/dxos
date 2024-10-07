//
// Copyright 2024 DXOS.org
//

import { clsx, type ClassValue } from 'clsx';
import React, { type ComponentType, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...classValues: ClassValue[]) => twMerge(clsx(...classValues));

export const style = <Props extends { className?: string }, T>(
  Component: ComponentType<Props>,
  ...styles: ClassValue[]
) => {
  const StyledComponent = forwardRef<T, Props>((props, ref) => (
    <Component ref={ref} {...props} className={cn(...styles, props.className)} />
  ));
  StyledComponent.displayName = `styled(${Component.displayName ?? Component.name})`;

  return StyledComponent;
};
