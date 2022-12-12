import React, { ComponentProps } from 'react';
import { mx } from '@dxos/react-uikit';

export const Main = (props: ComponentProps<'main'>) => {
  const { children, className, ...rest } = props;
  return <main className={mx('max-is-5xl mli-auto pli-7 pbs-16', className)}>{children}</main>;
};
