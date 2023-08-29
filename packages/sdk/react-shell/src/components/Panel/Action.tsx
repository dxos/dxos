//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { ButtonProps, Button } from '@dxos/aurora';

export type LargeButtonProps = ButtonProps & {
  isFull?: boolean;
};

export const Action = forwardRef<HTMLButtonElement, LargeButtonProps>((props, forwardedRef) => {
  const { children, classNames, isFull = true, ...rest } = props;
  return (
    <Button {...rest} classNames={[isFull && 'is-full', 'flex gap-2 plb-3 mbs-2', classNames]} ref={forwardedRef}>
      {children}
    </Button>
  );
});
