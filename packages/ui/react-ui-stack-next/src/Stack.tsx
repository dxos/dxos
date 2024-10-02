//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, type ComponentPropsWithoutRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const deckGrid = 'grid grid-cols-[repeat(99,min-content)]';

type StackProps = ThemedClassName<ComponentPropsWithoutRef<'div'>>;

export const Stack = ({ children, classNames, style, ...props }: StackProps) => {
  const childrenCount = React.Children.count(children);

  const styles: CSSProperties = {
    gridTemplateColumns: `repeat(${childrenCount}, min-content)`,
    ...style,
  };

  return (
    <div className={mx(deckGrid, classNames)} style={styles} {...props}>
      {children}
    </div>
  );
};
