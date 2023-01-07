//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps, FC } from 'react';

import { mx } from '@dxos/react-components';

export const Button: FC<ComponentProps<'button'>> = ({ className, ...buttonProps }) => {
  return <button {...buttonProps} className={mx('hover:text-gray-600 active:text-red-500', className)} />;
};
