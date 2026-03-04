//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * @deprecated create tailwind theme: dx-heading-2
 */
export const InputLabel = forwardRef<HTMLHeadingElement, ThemedClassName<ComponentPropsWithRef<'h2'>>>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <h2 {...props} className={mx('mb-4 mx-1 text-center font-normal text-base', classNames)} ref={forwardedRef}>
        {children}
      </h2>
    );
  },
);
