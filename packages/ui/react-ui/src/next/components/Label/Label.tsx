//
// Copyright 2026 DXOS.org
//

import React, { type LabelHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = composable<HTMLLabelElement, LabelProps>(({ children, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.label() });
  return (
    <label {...rest} data-scope='label' data-part='root' className={className} ref={forwardedRef}>
      {children}
    </label>
  );
});

Label.displayName = 'Next.Label';
