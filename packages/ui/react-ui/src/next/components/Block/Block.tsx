//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';

export type BlockProps = {
  /** Places the block in a parent Container's start or end gutter. */
  rail?: 'start' | 'end';
  /** Keeps the block's width but takes its content's height, for a slot in a row shorter than a block. */
  compact?: boolean;
};

/** A block-sized square that centres its content (typically an Icon); `compact` drops the fixed height. */
export const Block = composable<HTMLDivElement, BlockProps>(({ children, rail, compact, ...props }, forwardedRef) => {
  const { className, ...rest } = composableProps(props, { classNames: recipes.block() });
  return (
    <div
      {...rest}
      data-scope='block'
      data-part='root'
      data-rail={rail}
      data-compact={compact ? '' : undefined}
      className={className}
      ref={forwardedRef}
    >
      {children}
    </div>
  );
});

Block.displayName = 'Next.Block';
