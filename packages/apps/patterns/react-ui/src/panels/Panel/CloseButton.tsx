//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import { Button, ButtonProps, mx, getSize } from '@dxos/react-components';

export type CloseButtonProps = ButtonProps & {
  label?: string;
  'data-testid'?: string;
};

export const CloseButton = (props: CloseButtonProps) => {
  const { className, label, ...restProps } = props;
  return (
    <Button variant='ghost' className={mx('plb-3 pli-3 m-1 z-[1]', className)} {...restProps}>
      <X weight='bold' className={getSize(4)} />
      {label && <span className='sr-only'>{label}</span>}
    </Button>
  );
};
