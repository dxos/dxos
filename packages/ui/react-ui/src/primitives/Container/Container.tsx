//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { mx } from '@dxos/ui-theme';

import { composableProps, slottable } from '../../util';

export const Container = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps<HTMLDivElement>(props);
  return (
    <ark.div asChild={asChild} {...rest} className={mx('dx-expand', className)} ref={forwardedRef}>
      {children}
    </ark.div>
  );
});
