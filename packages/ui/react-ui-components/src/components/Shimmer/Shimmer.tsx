//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ShimmerProps = ThemedClassName<
  PropsWithChildren<{
    /** Animation duration in ms. */
    duration?: number;
  }>
>;

/**
 * Text element whose opacity animates left → right across the content in a loop.
 * Used as an "AI is thinking / streaming" indicator.
 *
 * The mask-based effect modulates true alpha, so the consumer's `color` token is preserved.
 */
export const Shimmer = ({ classNames, children, duration = 2_000 }: ShimmerProps) => {
  return (
    <span
      role='status'
      style={{ animationDuration: `${duration}ms` }}
      className={mx('inline-block max-w-full truncate shimmer-text', classNames)}
    >
      {children}
    </span>
  );
};
