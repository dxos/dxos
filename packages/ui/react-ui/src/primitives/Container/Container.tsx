//
// Copyright 2025 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { forwardRef } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Main
//

const CONTAINER_MAIN_NAME = 'Container.Main';

type MainProps = SlottableProps<HTMLDivElement> & {
  toolbar?: boolean;
  statusbar?: boolean;
};

const Main = forwardRef<HTMLDivElement, MainProps>(
  ({ classNames, className, asChild, children, role, toolbar, statusbar, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        ref={forwardedRef}
        role={role ?? 'none'}
        {...props}
        style={{
          gridTemplateRows: [toolbar && 'min-content', '1fr', statusbar && 'min-content'].filter(Boolean).join(' '),
        }}
        className={tx('container.main', { toolbar }, [className, classNames])}
      >
        {children}
      </Root>
    );
  },
);

Main.displayName = CONTAINER_MAIN_NAME;

//
// Container
//

export const Container = {
  Main,
};

export type { MainProps as ContainerMainProps };
