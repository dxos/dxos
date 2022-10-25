//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ComponentProps, PropsWithChildren } from 'react';

export const Main = ({
  children,
  className,
  ...mainProps
}: PropsWithChildren<ComponentProps<'main'>>) => {
  return (
    <main {...mainProps} className={cx('mt-8 px-8 space-y-4', className)}>
      {children}
    </main>
  );
};
