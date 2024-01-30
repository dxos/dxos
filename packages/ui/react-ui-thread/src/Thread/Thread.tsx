//
// Copyright 2023 DXOS.org
//

import { DotsThreeOutline } from '@phosphor-icons/react';
import React, { type ComponentProps, type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { hoverableControlItem, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import type { ThreadEntity } from '../types';

export type ThreadProps = ThemedClassName<ComponentPropsWithRef<'div'>> &
  ThreadEntity & { current?: boolean | ComponentProps<'div'>['aria-current'] };

export const Thread = forwardRef<HTMLDivElement, ThreadProps>(
  ({ current, children, classNames, ...props }, forwardedRef) => {
    return (
      <div
        role='group'
        {...(current && { 'aria-current': typeof current === 'string' ? current : 'location' })}
        {...props}
        className={mx(
          'is-full place-self-start grid grid-cols-[3rem_1fr] bg-[var(--surface-bg)] border-[color:var(--surface-separator)] border-bs border-be plb-1.5 attention attention-within attention-current [--controls-opacity:0]',
          hoverableFocusedWithinControls,
          classNames,
        )}
        ref={forwardedRef}
      >
        {children}
      </div>
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
        className={mx('col-start-2 grid grid-cols-[min-content_1fr_max-content] text-xs fg-description', classNames)}
        ref={forwardedRef}
      >
        <DotsThreeOutline
          weight='fill'
          data-visible={activity ? 'show' : 'hide'}
          className='is-6 bs-4 invisible data-[visible=show]:visible'
        />
        <span className='truncate min-is-0' aria-live='polite'>
          {activity ? children : null}
        </span>
        <span className={mx('text-end pie-1', hoverableControlItem)}>{t('enter to send message')}</span>
      </div>
    );
  },
);
