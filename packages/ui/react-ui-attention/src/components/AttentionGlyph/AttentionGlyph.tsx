//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type CSSProperties, forwardRef, useMemo } from 'react';

import { useIconHref } from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';
import { type Hue, type ThemedClassName } from '@dxos/ui-types';

import * as Activity from '../../types/Activity.ts';

export type AttentionGlyphProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'span'>, 'children'>> & {
  /** The item is the attended one: the glyph fills with the accent. */
  attended?: boolean;
  /** The attended item is inside this one: the glyph takes the softer contains tint. */
  containsAttended?: boolean;
  /** Activity on the item; the glyph draws one treatment per slot and animates at most one (see `Activity.resolve`). */
  treatments?: readonly Activity.Treatment[];
};

const VIEWERS_PATH =
  'M6.75 8.27311C7.38815 7.72296 7.79212 6.90866 7.79212 6C7.79212 5.09134 7.38815 4.27704 6.75 3.72689C7.06722 3.58122 7.42019 3.5 7.79212 3.5C9.17283 3.5 10.2921 4.61929 10.2921 6C10.2921 7.38071 9.17283 8.5 7.79212 8.5C7.42019 8.5 7.06723 8.41878 6.75 8.27311Z';
const STAR_PATH = 'M6 2.2l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z';

const DEFAULT_FILL_OPACITY = 0.25;

/** A hue's saturated fill shade, which reads on both themes at the glyph's size. */
const solid = (hue: Hue) => `var(--color-${hue}-bg)`;

const IconMark = ({ icon }: { icon: string }) => {
  const href = useIconHref(icon);
  return <use data-part='mark' href={href} x='2' y='2' width='8' height='8' />;
};

const Mark = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'dot':
      return <circle data-part='mark' cx='6' cy='6' r='2.5' />;
    case 'dots':
      return (
        <g data-part='mark'>
          <path d={VIEWERS_PATH} />
          <circle cx='4.25' cy='6' r='2.5' />
        </g>
      );
    case 'star':
      return <path data-part='mark' d={STAR_PATH} />;
    default:
      return <IconMark icon={icon} />;
  }
};

/**
 * A small square marking an item's attention state and the activity on it, one treatment per slot (see `Activity.Slot`).
 */
export const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(
  ({ classNames, style, attended, containsAttended, treatments, ...props }, forwardedRef) => {
    const { fill, mark, edge, corner, moving } = useMemo(
      () => Activity.resolve(treatments ?? [], { attention: attended || containsAttended }),
      [attended, containsAttended, treatments],
    );
    const colors = useMemo(
      (): CSSProperties & Record<`--${string}`, string> => ({
        ...(fill && {
          '--dx-attention-glyph-fill-hue': solid(fill.hue),
          '--dx-attention-glyph-fill-opacity': `${(fill.opacity ?? DEFAULT_FILL_OPACITY) * 100}%`,
        }),
        ...(mark && { '--dx-attention-glyph-mark': mark.hue ? solid(mark.hue) : 'var(--color-fg)' }),
        ...(edge && { '--dx-attention-glyph-edge': solid(edge.hue) }),
        ...(corner && { '--dx-attention-glyph-corner': solid(corner.hue) }),
      }),
      [fill, mark, edge, corner],
    );

    return (
      <span
        {...props}
        style={{ ...colors, ...style }}
        data-scope='attention-glyph'
        data-part='root'
        data-fill={attended ? 'attended' : containsAttended ? 'contains-attended' : fill && 'hue'}
        data-fill-hue={fill?.hue}
        data-mark={mark?.icon}
        data-mark-hue={mark?.hue}
        data-edge={edge && (edge.dashed ? 'dashed' : 'solid')}
        data-edge-hue={edge?.hue}
        data-corner={corner && (corner.shape ?? 'dot')}
        data-corner-hue={corner?.hue}
        data-moving={moving}
        className={mx('dx-attention-glyph', classNames)}
        ref={forwardedRef}
      >
        {(mark || edge || corner) && (
          <svg viewBox='0 0 12 12' fill='none' aria-hidden data-scope='attention-glyph' data-part='overlay'>
            {edge && <rect data-part='edge' x='0.5' y='0.5' width='11' height='11' rx='1.75' pathLength='48' />}
            {mark && <Mark icon={mark.icon} />}
            {corner && <circle data-part='corner' cx='12.25' cy='-0.25' r={corner.shape === 'ring' ? 2 : 2.5} />}
          </svg>
        )}
      </span>
    );
  },
);

AttentionGlyph.displayName = 'AttentionGlyph';
