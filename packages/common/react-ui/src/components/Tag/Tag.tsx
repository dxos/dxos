//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { PropsWithChildren, ReactNode } from 'react';

export interface TagProps extends React.ComponentProps<'span'> {
  children?: ReactNode;
}

export const Tag = ({ children, ...props }: PropsWithChildren<TagProps>) => {
  return (
    <span
      {...props}
      className={cx(
        'bg-neutral-100 text-neutral-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-neutral-700 dark:text-neutral-300',
        props.className
      )}
    >
      {children}
    </span>
  );
};
