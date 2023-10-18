//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { type ButtonProps, Button } from '@dxos/aurora';

export type LargeButtonProps = ButtonProps & {
  isFull?: boolean;
};

export const Action = forwardRef<HTMLButtonElement, LargeButtonProps>((props, forwardedRef) => {
  const { children, classNames, variant, isFull = true, ...rest } = props;
  const resolvedVariant = variant ?? 'default';
  return (
    <Button
      {...rest}
      classNames={[
        isFull && 'is-full',
        'flex gap-2 plb-3 mbs-2',
        classNames,
        !props.disabled
          ? resolvedVariant === 'default'
            ? 'bg-neutral-25 hover:bg-white hover:text-primary-500 active:bg-neutral-25 dark:active:bg-neutral-800'
            : resolvedVariant === 'ghost'
            ? 'active:bg-neutral-125 dark:active:bg-neutral-800'
            : resolvedVariant === 'primary'
            ? 'active:bg-primary-700 dark:active:bg-primary-500'
            : ''
          : '',
      ]}
      ref={forwardedRef}
      variant={variant}
    >
      {children}
    </Button>
  );
});
