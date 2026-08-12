//
// Copyright 2026 DXOS.org
//

import React, { Children, type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

const Stack = ({
  children,
  direction = 'horizontal',
}: PropsWithChildren<{ direction?: 'horizontal' | 'vertical' }>) => {
  const count = Children.count(children);
  return (
    <div
      className={mx('dx-container grid p-3 gap-3')}
      style={
        direction === 'horizontal'
          ? { gridTemplateColumns: `repeat(${count}, 1fr)` }
          : { gridTemplateRows: `repeat(${count}, 1fr)` }
      }
    >
      {children}
    </div>
  );
};

const Panel = ({ children }: PropsWithChildren) => {
  return <div className='dx-container border border-separator rounded-md'>{children}</div>;
};

export const TestGrid = {
  Stack,
  Panel,
};
