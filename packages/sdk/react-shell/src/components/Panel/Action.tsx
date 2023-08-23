//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ButtonProps, Button } from '@dxos/aurora';

export type LargeButtonProps = ButtonProps & {
  isFull?: boolean;
};

export const Action = (props: LargeButtonProps) => {
  const { children, classNames, isFull = true, ...rest } = props;
  return (
    <Button classNames={[isFull && 'is-full', 'flex gap-2 plb-3 mbs-2', classNames]} {...rest}>
      {children}
    </Button>
  );
};
