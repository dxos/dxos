//
// Copyright 2023 DXOS.org
//

import { ArrowBendLeftDown, Spinner } from '@phosphor-icons/react';
import React, { type ComponentProps, type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { hoverableControlItem, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import type { ThreadEntity } from '../types';

export type ThreadProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  ThreadEntity & { current?: boolean | ComponentProps<'div'>['aria-current'] };

export const threadLayout = 'is-full place-self-start grid grid-cols-[var(--rail-size)_1fr]';

export const Thread = forwardRef<HTMLDivElement, ThreadProps>(
  ({ current, children, classNames, ...props }, forwardedRef) => {
    return (
      <div
        role='group'
        data-testid='thread'
        {...(current && { 'aria-current': typeof current === 'string' ? current : 'location' })}
        {...props}
        className={mx(
          threadLayout,
          hoverableFocusedWithinControls,
          'bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be plb-1.5 attention attention-within attention-current [--controls-opacity:0]',
          classNames,
        )}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

export type ThreadHeadingProps = ThemedClassName<ComponentPropsWithRef<'div'>> & { detached?: boolean };

export const ThreadHeading = forwardRef<HTMLParagraphElement, ThreadHeadingProps>(
  ({ classNames, children, detached, ...props }, forwardedRef) => {
    return (
      <>
        <div role='none' className='grid place-items-end pie-3.5 fg-description'>
          <ArrowBendLeftDown />
        </div>
        <p
          role='heading'
          data-testid='thread.heading'
          {...props}
          className={mx(
            'fg-description font-medium truncate before:content-[open-quote] after:content-[close-quote]',
            detached && 'line-through decoration-1',
          )}
          ref={forwardedRef}
        >
          {children}
        </p>
      </>
    );
  },
);

export type ThreadFooterProps = ThemedClassName<ComponentPropsWithRef<'div'>> & {
  activity?: boolean;
};

export const ThreadFooter = forwardRef<HTMLDivElement, ThreadFooterProps>(
  ({ activity, classNames, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <div
        {...props}
        className={mx(
          'col-start-2 grid grid-cols-[min-content_1fr_max-content] text-xs fg-description pb-2',
          classNames,
        )}
        ref={forwardedRef}
      >
        <Spinner
          weight='bold'
          data-visible={activity ? 'show' : 'hide'}
          className='is-6 bs-4 invisible data-[visible=show]:visible animate-spin-slow'
        />
        <span className='truncate min-is-0' aria-live='polite'>
          {activity ? children : null}
        </span>
        <span className={mx('text-end pie-1', hoverableControlItem)}>{t('enter to send message')}</span>
      </div>
    );
  },
);
