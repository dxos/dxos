//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { hoverableControlItem, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import type { ThreadEntity } from '../types';

// TODO(burdon): Why is this exported?
export const threadLayout = 'is-full place-self-start grid grid-cols-[var(--rail-size)_1fr]';

//
// Root
//

type ThreadRootProps = ThemedClassName<ComponentPropsWithRef<'div'>> & ThreadEntity & { current?: boolean };

const ThreadRoot = forwardRef<HTMLDivElement, ThreadRootProps>(
  ({ current, children, classNames, ...props }, forwardedRef) => (
    <div
      role='group'
      data-testid='thread'
      {...(current && { 'aria-current': typeof current === 'string' ? current : 'location' })}
      {...props}
      className={mx(
        threadLayout,
        hoverableFocusedWithinControls,
        'bg-[var(--surface-bg)] current-related attention-surface [--controls-opacity:0]',
        classNames,
      )}
      ref={forwardedRef}
    >
      {children}
    </div>
  ),
);

//
// Heading
//

type ThreadHeaderProps = ComponentPropsWithRef<'div'> & { detached?: boolean };

const ThreadHeader = forwardRef<HTMLParagraphElement, ThreadHeaderProps>(
  ({ children, detached, ...props }, forwardedRef) => (
    <>
      <div role='none' className='flex items-center justify-center text-description'>
        <Icon icon='ph--caret-double-right--regular' />
      </div>
      <div role='none' className='flex items-center overflow-hidden'>
        <p
          role='heading'
          data-testid='thread.heading'
          {...props}
          className={mx('mie-2 text-description font-medium truncate italic', detached && 'line-through decoration-1')}
          ref={forwardedRef}
        >
          {children}
        </p>
      </div>
    </>
  ),
);

//
// Status
//

type ThreadStatusProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  activity?: boolean;
};

const ThreadStatus = forwardRef<HTMLDivElement, ThreadStatusProps>(
  ({ activity, classNames, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <div
        {...props}
        className={mx(
          'col-start-2 grid grid-cols-[min-content_1fr_max-content] pb-2 pie-2 text-xs text-description',
          classNames,
        )}
        ref={forwardedRef}
      >
        <Icon
          icon='ph--spinner--bold'
          classNames='is-6 bs-4 invisible data-[visible=show]:visible animate-spin-slow'
          data-visible={activity ? 'show' : 'hide'}
        />
        <span className='truncate min-is-0' aria-live='polite'>
          {activity ? children : null}
        </span>
        <span className={mx('text-end', hoverableControlItem)}>{t('enter to send message')}</span>
      </div>
    );
  },
);

export const Thread = {
  Root: ThreadRoot,
  Header: ThreadHeader,
  Status: ThreadStatus,
};

export type { ThreadRootProps, ThreadHeaderProps as ThreadHeadingProps, ThreadStatusProps };
