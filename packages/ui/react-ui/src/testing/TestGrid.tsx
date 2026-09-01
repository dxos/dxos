//
// Copyright 2026 DXOS.org
//

import React, { Children, type ComponentPropsWithoutRef, type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

type StackProps = PropsWithChildren<{ orientation?: 'horizontal' | 'vertical' }> & ComponentPropsWithoutRef<'div'>;

const Root = ({ children }: PropsWithChildren) => {
  return <div className='dx-expand grid p-3'>{children}</div>;
};

const Stack = ({ children, orientation = 'horizontal', className, ...props }: StackProps) => {
  // `toArray`, not `count`: `count` includes null/undefined/boolean slots, so a conditional cell
  // (`{selected && <Panel/>}`) would still claim a track and leave a gap when it renders nothing.
  const count = Children.toArray(children).length;
  return (
    <div
      {...props}
      className={mx('dx-expand grid gap-3', className)}
      style={
        orientation === 'horizontal'
          ? { gridTemplateColumns: `repeat(${count}, 1fr)` }
          : { gridTemplateRows: `repeat(${count}, 1fr)` }
      }
    >
      {children}
    </div>
  );
};

// Props are forwarded so a story can mark one cell as the attended surface
// (`useAttentionAttributes`), which is what drives selection and keyboard navigation inside it.
const Panel = ({ children, className, ...props }: PropsWithChildren<ComponentPropsWithoutRef<'div'>>) => {
  return (
    <div {...props} className={mx('dx-expand overflow-hidden border border-separator rounded-md', className)}>
      {children}
    </div>
  );
};

export const TestGrid = {
  Root,
  Stack,
  Panel,
};
