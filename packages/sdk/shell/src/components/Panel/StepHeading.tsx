//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

export const StepHeading = forwardRef<HTMLHeadingElement, ComponentPropsWithRef<'h2'>>(
  ({ children, className, ...props }, forwardedRef) => {
    return (
      <h2 {...props} className={mx('font-normal text-sm mbe-4 mli-1 text-center', className)} ref={forwardedRef}>
        {children}
      </h2>
    );
  },
);
