//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { Button as BaseButton, ButtonProps as BaseButtonProps, mx } from '@dxos/react-components';

export type ButtonProps = BaseButtonProps & {
  before?: ReactNode;
};

export const Button = (props: ButtonProps) => {
  const { before, children, ...restProps } = props;
  return (
    <BaseButton
      className={mx('text-base p-4 block w-full mlb-2', before ? 'flex flex-row justify-start text-left gap-3 pli-4' : 'pli-8')}
      {...restProps}
    >
      {before}
      {children}
    </BaseButton>
  );
};
