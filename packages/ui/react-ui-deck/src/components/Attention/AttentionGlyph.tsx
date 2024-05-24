//
// Copyright 2024 DXOS.org
//

import { Minus } from '@phosphor-icons/react';
import { type Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { focusRing, mx } from '@dxos/react-ui-theme';

const attentionGlyphStyles =
  'inline-block rounded-sm is-3 bs-3 bg-transparent fg-accent transition-colors [[aria-current]_&]:surface-unAccent [[aria-current]_&]:fg-inverse [[data-attention=true]_&]:surface-accent [[data-attention=true]_&]:fg-inverse [[aria-current][data-attention=true]_&]:surface-accent [[aria-current][data-attention=true]_&]:fg-inverse';

const closeIconStyles =
  'hidden is-3 bs-3 group-[[aria-current]_&:hover]/attentionGlyphButton:block group-[[aria-current]_&:focus]/attentionGlyphButton:block group-[[data-attention=true]_&:hover]/attentionGlyphButton:block group-[[data-attention=true]_&:focus]/attentionGlyphButton:block group-[[aria-current][data-attention=true]_&:hover]/attentionGlyphButton:block group-[[aria-current][data-attention=true]_&:focus]/attentionGlyphButton:block';

const presenceIconStyles =
  'is-3 bs-3 group-[[aria-current]_&:hover]/attentionGlyphButton:hidden group-[[aria-current]_&:focus]/attentionGlyphButton:hidden group-[[data-attention=true]_&:hover]/attentionGlyphButton:hidden group-[[data-attention=true]_&:focus]/attentionGlyphButton:hidden group-[[aria-current][data-attention=true]_&:hover]/attentionGlyphButton:hidden group-[[aria-current][data-attention=true]_&:focus]/attentionGlyphButton:hidden';

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

export type AttentionGlyphProps = {
  presence?: 'none' | 'one' | 'many';
} & ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.span>, 'children'>>;

export const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(
  ({ presence, classNames, ...props }, forwardedRef) => {
    return (
      <span role='none' {...props} className={mx(attentionGlyphStyles, classNames)} ref={forwardedRef}>
        {presence === 'many' && <PresenceMany />}
        {presence === 'one' && <PresenceOne />}
      </span>
    );
  },
);

export const AttentionGlyphCloseButton = forwardRef<HTMLButtonElement, AttentionGlyphProps>(
  ({ presence, classNames, ...props }, forwardedRef) => {
    return (
      <button
        {...props}
        className={mx(
          attentionGlyphStyles,
          focusRing,
          'group/attentionGlyphButton pointer-events-none [[aria-current]_&]:pointer-events-auto [[data-attention=true]_&]:pointer-events-auto [[aria-current][data-attention=true]_&]:pointer-events-auto',
          classNames,
        )}
        ref={forwardedRef}
      >
        {presence === 'many' && <PresenceMany />}
        {presence === 'one' && <PresenceOne />}
        <Minus weight='bold' className={closeIconStyles} />
      </button>
    );
  },
);
