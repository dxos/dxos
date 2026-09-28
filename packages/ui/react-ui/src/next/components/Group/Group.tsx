//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React from 'react';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type GroupProps = {
  justify?: 'start' | 'end' | 'between';
};

/**
 * A plain flex run of controls (e.g. a form's action buttons) with no role: unlike Toolbar it claims no keyboard
 * contract, and unlike a row Container it needs no track per child.
 */
export const Group = slottable<HTMLDivElement, GroupProps>(
  ({ children, asChild, justify = 'start', ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props, { classNames: recipes.group() });
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-scope='group'
        data-part='root'
        data-justify={justify}
        className={className}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

Group.displayName = 'Next.Group';
