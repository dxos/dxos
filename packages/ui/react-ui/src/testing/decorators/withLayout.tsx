//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type FC, type PropsWithChildren } from 'react';

import { type ClassNameValue, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ContainerProps = ThemedClassName<PropsWithChildren>;

export type ContainerType = 'default' | 'column';

export type WithLayoutProps =
  | FC<ContainerProps>
  | { classNames?: ClassNameValue; container?: ContainerType; scroll?: boolean };

/**
 * Adds layout container.
 */
export const withLayout =
  (props: WithLayoutProps): Decorator =>
  (Story) => {
    if (typeof props === 'function') {
      const Container = props;
      return (
        <Container>
          <Story />
        </Container>
      );
    }

    const Container = layouts[(props as any).container as ContainerType] ?? layouts.default;
    return (
      <Container classNames={mx(props.classNames, props.scroll ? 'overflow-y-auto' : 'overflow-hidden')}>
        <Story />
      </Container>
    );
  };

const layouts: Record<ContainerType, FC<ContainerProps>> = {
  default: ({ children, classNames }: ContainerProps) => (
    <div role='none' className={mx(classNames)}>
      {children}
    </div>
  ),

  column: ({ children, classNames }: ContainerProps) => (
    <div role='none' className='fixed inset-0 flex justify-center overflow-hidden bg-deckSurface'>
      <div role='none' className={mx('flex flex-col is-[40rem] bg-baseSurface', classNames)}>
        {children}
      </div>
    </div>
  ),
};
