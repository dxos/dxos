//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, type ComponentPropsWithoutRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type Orientation = 'horizontal' | 'vertical';

export type StackProps = Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'aria-orientation'> & {
  orientation?: Orientation;
};

export const Stack = ({ children, classNames, style, orientation, ...props }: StackProps) => {
  const childrenCount = React.Children.count(children);

  const styles: CSSProperties = {
    [orientation === 'horizontal' ? 'gridTemplateColumns' : 'gridTemplateRows']:
      `repeat(${childrenCount}, min-content)`,
    ...style,
  };

  return (
    <div className={mx('grid', classNames)} aria-orientation={orientation} style={styles} {...props}>
      {children}
    </div>
  );
};
