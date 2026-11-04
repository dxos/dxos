//
// Copyright 2026 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef, useMemo } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

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
const AGENT_PATH = 'M6 2.2l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z';

const Mark = ({ mark }: { mark: Activity.MarkTreatment }) => {
  switch (mark) {
    case 'viewer':
      return <circle data-part='mark' cx='6' cy='6' r='2.5' />;
    case 'viewers':
    case 'viewers-working':
      return (
        <g data-part='mark'>
          <path d={VIEWERS_PATH} />
          <circle cx='4.25' cy='6' r='2.5' />
        </g>
      );
    case 'agent':
    case 'agent-done':
      return <path data-part='mark' d={AGENT_PATH} />;
    case 'typing':
      return (
        <g data-part='mark'>
          <circle cx='3' cy='6' r='1.25' />
          <circle cx='6' cy='6' r='1.25' />
          <circle cx='9' cy='6' r='1.25' />
        </g>
      );
  }
};

/**
 * A small square marking an item's attention state and the activity on it. Activity draws in four slots: the fill,
 * a mark inside, the square's edge and a dot at its corner. The state is the glyph's own attributes, so it needs no
 * host markup.
 */
export const AttentionGlyph = forwardRef<HTMLSpanElement, AttentionGlyphProps>(
  ({ classNames, attended, containsAttended, treatments, ...props }, forwardedRef) => {
    const { fill, mark, edge, corner, moving } = useMemo(
      () =>
        Activity.resolve([
          ...(attended ? (['attended'] as const) : []),
          ...(containsAttended ? (['contains-attended'] as const) : []),
          ...(treatments ?? []),
        ]),
      [attended, containsAttended, treatments],
    );

    return (
      <span
        {...props}
        data-scope='attention-glyph'
        data-part='root'
        data-fill={fill}
        data-mark={mark}
        data-edge={edge}
        data-corner={corner}
        data-moving={moving}
        className={mx('dx-attention-glyph', classNames)}
        ref={forwardedRef}
      >
        {(mark || edge || corner) && (
          <svg viewBox='0 0 12 12' fill='none' aria-hidden data-scope='attention-glyph' data-part='overlay'>
            {edge && <rect data-part='edge' x='0.5' y='0.5' width='11' height='11' rx='1.75' pathLength='48' />}
            {mark && <Mark mark={mark} />}
            {corner && <circle data-part='corner' cx='12.25' cy='-0.25' r='2.5' />}
          </svg>
        )}
      </span>
    );
  },
);

AttentionGlyph.displayName = 'AttentionGlyph';
