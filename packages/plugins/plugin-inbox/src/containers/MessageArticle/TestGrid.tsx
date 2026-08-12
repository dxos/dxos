//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

const Stack = ({
  children,
  direction = 'horizontal',
}: PropsWithChildren<{ direction?: 'horizontal' | 'vertical' }>) => {
  return (
    <div className={mx('dx-container grid', direction === 'horizontal' ? 'grid-cols-2' : 'grid-rows-2')}>
      {children}
    </div>
  );
};

const Panel = ({ children }: PropsWithChildren<{}>) => {
  return <div className='dx-container border border-separator rounded-md p-2'>{children}</div>;
};

export const TestGrid = {
  Stack,
  Panel,
};
