//
// Copyright 2023 DXOS.org
//

import { type Decorator } from '@storybook/react';
import React, { type FC, type PropsWithChildren, memo } from 'react';

import { type ClassNameValue, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ContainerProps = ThemedClassName<PropsWithChildren>;

export type ContainerType = 'default' | 'centered' | 'fullscreen' | 'column';

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
      const { layout = 'default', classNames, scroll } = props;
      const Container = layouts[layout] ?? layouts.fullscreen;
      return (
        <Container classNames={mx(classNames, scroll ? 'overflow-y-auto' : 'overflow-hidden')}>
          <MemoizedStory />
        </Container>
      );
    }
  };

const layouts: Record<ContainerType, FC<ContainerProps>> = {
  default: ({ classNames, children }: ContainerProps) => (
    <div role='none' className={mx('p-4', classNames)}>
      {children}
    </div>
  ),

  centered: ({ classNames, children }: ContainerProps) => (
    <div role='none' className={mx('fixed inset-0 flex grid place-items-center', classNames)}>
      {children}
    </div>
  ),

  fullscreen: ({ classNames, children }: ContainerProps) => (
    <div role='none' className={mx('fixed inset-0 flex overflow-hidden bg-deck-surface', classNames)}>
      {children}
    </div>
  ),

  column: ({ classNames, children }: ContainerProps) => (
    <div role='none' className='fixed inset-0 flex justify-center overflow-hidden bg-deck-surface'>
      <div role='none' className={mx('flex flex-col w-[40rem] bg-base-surface', classNames)}>
        {children}
      </div>
    </div>
  ),
};
