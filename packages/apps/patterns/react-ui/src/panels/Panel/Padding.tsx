//
// Copyright 2023 DXOS.org
//

import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type PaddingProps = {
  className?: string;
  children?: ReactNode;
  padding?: boolean;
};

export const Padding = (props: PaddingProps) => {
  const { className, children, padding } = props;
  return <div className={mx(padding && 'p-4 pbs-2', className)}>{children}</div>;
};
