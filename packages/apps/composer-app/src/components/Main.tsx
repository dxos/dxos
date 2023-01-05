//
// Copyright 2022 DXOS.org
//

import { mx } from '@@dxos/react-components';
import React, { ComponentProps } from 'react';

export const Main = (props: ComponentProps<'main'>) => {
  const { children, className, ...rest } = props;
  return (
    <main className={mx('max-is-5xl mli-auto pli-7 pbs-16', className)} {...{ rest }}>
      {children}
    </main>
  );
};
