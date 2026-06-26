//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, forwardRef } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ItemContentProps = ThemedClassName<{
  /** Leading icon name; rendered in a rail-sized slot centered on the title line. */
  icon?: string;
  /** Extra classes for the leading icon (e.g. a status colour). */
  iconClassNames?: string;
  /** Primary line. */
  title: ReactNode;
  /** Optional secondary line, aligned under the title in the content column. */
  description?: ReactNode;
}>;

/**
 * Presentational row layout: a rail-sized leading icon centered on the primary line, with an
 * optional secondary line aligned beneath the title in the content column. Drop inside a
 * `Listbox.Item`, an `Accordion.ItemHeader`, or any row container.
 *
 * The grid uses the same `var(--dx-rail-item)` rail track as `useListGrid`, so an adjacent body
 * (e.g. an `Accordion.ItemBody`) can reuse `grid-cols-[var(--dx-rail-item)_1fr]` to line its
 * content up under the same content column.
 */
export const ItemContent = forwardRef<HTMLDivElement, ItemContentProps>(
  ({ classNames, icon, iconClassNames, title, description }, forwardedRef) => (
    <div
      ref={forwardedRef}
      className={mx('grid grid-cols-[var(--dx-rail-item)_1fr] items-center gap-x-2 is-full min-is-0', classNames)}
    >
      {icon && (
        <Icon icon={icon} size={5} classNames={mx('col-start-1 row-start-1 place-self-center', iconClassNames)} />
      )}
      <span className='col-start-2 row-start-1 truncate'>{title}</span>
      {description != null && (
        <span className='col-start-2 row-start-2 truncate text-sm text-description'>{description}</span>
      )}
    </div>
  ),
);

ItemContent.displayName = 'ItemContent';
