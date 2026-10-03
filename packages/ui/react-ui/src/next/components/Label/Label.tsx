//
// Copyright 2026 DXOS.org
//

import React, { type LabelHTMLAttributes } from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  /** Visually hidden but still names its control (e.g. a search input whose placeholder says what it is). */
  srOnly?: boolean;
};

export const Label = composable<HTMLLabelElement, LabelProps>(({ children, srOnly, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.label() });
  return (
    <label
      {...rest}
      data-scope='label'
      data-part='root'
      data-sr-only={srOnly ? '' : undefined}
      className={className}
      ref={forwardedRef}
    >
      {children}
    </label>
  );
});

Label.displayName = 'Next.Label';
