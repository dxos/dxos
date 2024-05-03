//
// Copyright 2024 DXOS.org
//

import { type Primitive } from '@radix-ui/react-primitive';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const PresenceOne = () => {
  return (
    <svg
      width='12'
      height='12'
      className='is-3 bs-3'
      viewBox='0 0 12 12'
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
      className='is-3 bs-3'
      viewBox='0 0 12 12'
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

const attentionGlyphStyles =
  'inline-block rounded-sm is-3 bs-3 bg-transparent fg-accent transition-colors [[aria-current]_&]:surface-unAccent [[aria-current]_&]:fg-inverse [[data-attention=true]_&]:surface-accent [[data-attention=true]_&]:fg-inverse [[aria-current][data-attention=true]_&]:surface-accent [[aria-current][data-attention=true]_&]:fg-inverse';

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
