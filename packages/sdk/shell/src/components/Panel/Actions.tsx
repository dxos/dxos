//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type ActionsProps = Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'children'> & {
  children: ReactNode | ReactNode[];
};

const Actions = forwardRef<HTMLDivElement, ActionsProps>(({ classNames, children, ...props }, forwardedRef) => (
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
));

export { Actions };
export type { ActionsProps };
