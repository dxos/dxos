//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type FC, type PropsWithChildren, memo } from 'react';

import { type ClassNameValue, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ContainerProps = ThemedClassName<PropsWithChildren>;

export type ContainerType = 'fullscreen' | 'column';

export type WithLayoutProps =
  | FC<ContainerProps>
  | {
      classNames?: ClassNameValue;
      layout?: ContainerType;
      scroll?: boolean;
    };

/**
 * Adds layout container.
 */
export const withLayout =
  (props: WithLayoutProps = {}): Decorator =>
  (Story) => {
    // Prevent re-rendering of the story.
    const MemoizedStory = memo(Story);
    if (typeof props === 'function') {
      const Container = props;
      return (
        <Container>
          <MemoizedStory />
        </Container>
      );
    } else {
      const { layout = 'fullscreen', classNames, scroll } = props;
      const Container = layouts[layout] ?? layouts.fullscreen;
      return (
        <Container classNames={mx(classNames, scroll ? 'overflow-y-auto' : 'overflow-hidden')}>
          <MemoizedStory />
        </Container>
      );
    }
  };

const layouts: Record<ContainerType, FC<ContainerProps>> = {
  fullscreen: ({ children, classNames }: ContainerProps) => (
    <div role='none' className={mx('fixed inset-0 flex overflow-hidden bg-deckSurface', classNames)}>
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
