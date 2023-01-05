//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Replace clsx with mx;

import React, { ComponentProps, FC } from 'react';

import { mx } from '@dxos/react-ui';

export const Button: FC<ComponentProps<'button'>> = ({ className, ...buttonProps }) => {
  return <button {...buttonProps} className={mx('hover:text-gray-600 active:text-red-500', className)} />;
};
