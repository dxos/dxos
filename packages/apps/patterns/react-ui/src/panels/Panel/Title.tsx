//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Heading as BaseHeading, HeadingProps as BaseHeadingProps, mx } from '@dxos/react-components';

export type TitleProps = PropsWithChildren &
  BaseHeadingProps & {
    className?: string;
  };

export const Title = (props: TitleProps) => {
  const { children, className, ...restProps } = props;
  return (
    <BaseHeading
      className={mx(
        'font-body font-system-normal text-neutral-650 dark:text-neutral-300 text-sm text-center grow plb-2.5 pbe-0 mbe-2.5 select-none',
        className
      )}
      {...restProps}
    >
      {children}
    </BaseHeading>
  );
};
