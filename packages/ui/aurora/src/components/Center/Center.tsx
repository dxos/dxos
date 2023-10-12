//
// Copyright 2023 DXOS.org
//

import React, { type DetailedHTMLProps, type PropsWithChildren, type HTMLAttributes } from 'react';

export type CenterProps = PropsWithChildren<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>>;

export const Center = (props: CenterProps) => {
  const { children, className, ...rest } = props;
  return (
    <div className={'h-full flex items-center justify-center ' + className} {...rest}>
      {children}
    </div>
  );
};
