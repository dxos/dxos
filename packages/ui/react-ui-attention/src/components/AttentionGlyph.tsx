//
// Copyright 2024 DXOS.org
//

import { type Primitive } from '@radix-ui/react-primitive';
import React, { type CSSProperties, type ComponentPropsWithRef, forwardRef, useMemo } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const attentionGlyphStyles = mx(
  'inline-block rounded-xs w-3 h-3 bg-transparent text-accent-text transition-colors',
  '[data-contains-attended=true]_&:bg-attentionRelated',
  '[data-attention=true]_&:bg-accent-surface',
  '[data-attention=true]_&:text-accent-surface-text',
  '[aria-current][data-attention=true]_&:bg-accent-surface',
  '[aria-current][data-attention=true]_&:text-accent-surface-text',
  '[aria-selected="true"][data-attention=true]_&:bg-accent-surface',
  '[aria-selected="true"][data-attention=true]_&:text-accent-surface-text',
);

const presenceIconStyles = mx('w-3 h-3');

const PresenceOne = () => {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 12 12'
      className={presenceIconStyles}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='6' cy='6' r='2.5' fill='currentColor' />
    </svg>
  );
};

const PresenceMany = () => {
  return (
    <svg
      width='12'
      height='12'
      viewBox='0 0 12 12'
      className={presenceIconStyles}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M6.75 8.27311C7.38815 7.72296 7.79212 6.90866 7.79212 6C7.79212 5.09134 7.38815 4.27704 6.75 3.72689C7.06722 3.58122 7.42019 3.5 7.79212 3.5C9.17283 3.5 10.2921 4.61929 10.2921 6C10.2921 7.38071 9.17283 8.5 7.79212 8.5C7.42019 8.5 7.06723 8.41878 6.75 8.27311Z'
        fill='currentColor'
      />
      <circle cx='4.25' cy='6' r='2.5' fill='currentColor' />
    </svg>
  );
};

export const Syncing = () => {
  const animationProps = useMemo<CSSProperties>(
    () => ({
      // Synchronize animations.
      animationDelay: `-${Date.now() % 2_000}ms`,
    }),
    [],
  );

  return (
    <div role='status' className='flex items-center'>
      <Icon
        icon='ph--circle-notch--bold'
        size={3}
        style={animationProps}
        classNames='text-subdued animate-[spin_2s_linear_infinite]'
      />
    </div>
  );
};

export type AttentionGlyphProps = {
  attended?: boolean;
  containsAttended?: boolean;
  syncing?: boolean;
  presence?: 'none' | 'one' | 'many';
} & ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.span>, 'children'>>;

export const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(
  ({ presence, attended, syncing, containsAttended, classNames, ...props }, forwardedRef) => {
    const icon = syncing ? (
      <Syncing />
    ) : presence === 'many' ? (
      <PresenceMany />
    ) : presence === 'one' ? (
      <PresenceOne />
    ) : null;

    return (
      <div role='none' className='flex group' data-attention={attended} data-contains-attended={containsAttended}>
        <span role='none' {...props} className={mx(attentionGlyphStyles, classNames)} ref={forwardedRef}>
          {icon}
        </span>
      </div>
    );
  },
);
