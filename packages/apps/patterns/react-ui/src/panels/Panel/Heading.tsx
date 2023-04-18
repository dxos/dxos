//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Heading as BaseHeading, HeadingProps as BaseHeadingProps, mx } from '@dxos/react-components';

export type HeadingProps = PropsWithChildren & BaseHeadingProps & {};

export const Heading = (props: HeadingProps) => {
  const { children, className, ...restProps } = props;
  return (
    <BaseHeading className={mx('font-body font-system-medium text-base text-center mlb-4', className)} {...restProps}>
      {children}
    </BaseHeading>
  );
};
