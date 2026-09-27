//
// Copyright 2026 DXOS.org
//

import React, { Children, type ComponentPropsWithoutRef, type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

type StackProps = PropsWithChildren<{
  orientation?: 'horizontal' | 'vertical';
  /**
   * Track sizes along the orientation's axis, underscore-separated as in a Tailwind arbitrary value
   * (e.g. `2fr_1fr`); defaults to one equal track per child.
   */
  layout?: string;
}> &
  ComponentPropsWithoutRef<'div'>;

const Root = ({ children }: PropsWithChildren) => {
  return <div className='dx-expand grid p-3'>{children}</div>;
};

const Stack = ({ children, orientation = 'horizontal', layout, className, ...props }: StackProps) => {
  // `toArray`, not `count`: `count` includes null/undefined/boolean slots, so a conditional cell
  // (`{selected && <Panel/>}`) would still claim a track and leave a gap when it renders nothing.
  const count = Children.toArray(children).length;
  const tracks = layout?.replaceAll('_', ' ') ?? `repeat(${count}, 1fr)`;
  return (
    <div
      {...props}
      className={mx('dx-expand grid gap-3', className)}
      style={orientation === 'horizontal' ? { gridTemplateColumns: tracks } : { gridTemplateRows: tracks }}
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
