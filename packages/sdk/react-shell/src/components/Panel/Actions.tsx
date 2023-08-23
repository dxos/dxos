//
// Copyright 2023 DXOS.org
//

import React, { ComponentPropsWithoutRef, forwardRef, ReactNode } from 'react';

import { ThemedClassName } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

type ActionsProps = Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'children'> & {
  children: ReactNode | ReactNode[];
};

const Actions = forwardRef<HTMLDivElement, ActionsProps>(({ classNames, children, ...props }, forwardedRef) => {
  return (
    <div
      {...props}
      className={mx(
        'flex flex-col gap-2 mbs-2',
        Array.isArray(children) && children.length > 1 ? 'justify-between' : 'justify-center',
        classNames,
      )}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

export { Actions };
export type { ActionsProps };
