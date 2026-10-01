//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type CSSProperties, forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

export type AttentionGlyphPresence = 'none' | 'one' | 'many';

export type AttentionGlyphProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'span'>, 'children'>> & {
  /** The item is the attended one: the glyph fills with the accent. */
  attended?: boolean;
  /** The attended item is inside this one: the glyph takes the softer contains tint. */
  containsAttended?: boolean;
  /** Shows a spinner in place of the presence mark. */
  syncing?: boolean;
  /** How many others are viewing the item. */
  presence?: AttentionGlyphPresence;
};

const PresenceOne = () => (
  <svg
    viewBox='0 0 12 12'
    fill='none'
    aria-hidden
    data-scope='attention-glyph'
    data-part='mark'
    className={recipes.attentionGlyphMark()}
  >
    <circle cx='6' cy='6' r='2.5' fill='currentColor' />
  </svg>
);

const PresenceMany = () => (
  <svg
    viewBox='0 0 12 12'
    fill='none'
    aria-hidden
    data-scope='attention-glyph'
    data-part='mark'
    className={recipes.attentionGlyphMark()}
  >
    <path
      d='M6.75 8.27311C7.38815 7.72296 7.79212 6.90866 7.79212 6C7.79212 5.09134 7.38815 4.27704 6.75 3.72689C7.06722 3.58122 7.42019 3.5 7.79212 3.5C9.17283 3.5 10.2921 4.61929 10.2921 6C10.2921 7.38071 9.17283 8.5 7.79212 8.5C7.42019 8.5 7.06723 8.41878 6.75 8.27311Z'
      fill='currentColor'
    />
    <circle cx='4.25' cy='6' r='2.5' fill='currentColor' />
  </svg>
);

/** Every spinner on the page shares one phase, so a list of syncing items turns together rather than flickering. */
const Syncing = () => {
  const style = useMemo<CSSProperties>(() => ({ animationDelay: `-${Date.now() % 2_000}ms` }), []);
  return <Icon icon='ph--circle-notch--bold' data-spin='' style={style} />;
};

/**
 * A small square marking an item's attention state (attended, or containing the attended item) and, inside it, who
 * else is viewing it or whether it is syncing. The state is the glyph's own attributes, so it needs no host markup.
 */
export const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(
  ({ classNames, attended, containsAttended, syncing, presence = 'none', ...props }, forwardedRef) => (
    <span
      {...props}
      data-scope='attention-glyph'
      data-part='root'
      data-attended={attended ? '' : undefined}
      data-contains-attended={containsAttended ? '' : undefined}
      data-syncing={syncing ? '' : undefined}
      data-presence={presence}
      className={mx(recipes.attentionGlyph(), classNames)}
      ref={forwardedRef}
    >
      {syncing ? <Syncing /> : presence === 'many' ? <PresenceMany /> : presence === 'one' ? <PresenceOne /> : null}
    </span>
  ),
);

AttentionGlyph.displayName = 'Next.AttentionGlyph';
