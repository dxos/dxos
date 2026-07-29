//
// Copyright 2026 DXOS.org
//

import React, { type ReactElement, type ReactNode, forwardRef } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { listTheme } from '../List.theme';

/**
 * Presentational row layout: a rail-sized leading icon centered on the primary line, with an
 * optional secondary line aligned beneath the title in the content column. Drop inside a
 * `Listbox.Item`, an `Accordion.ItemHeader`, or any row container.
 *
 * The grid uses the same `var(--dx-rail-item)` rail track as `useListGrid`, so an adjacent body
 * (e.g. an `Accordion.ItemBody`) can reuse `grid-cols-[var(--dx-rail-item)_1fr]` to line its
 * content up under the same content column.
 */
export type ListItemContentProps = ThemedClassName<{
  /**
   * Leading icon: an icon name (rendered as a neutral size-5 `Icon`) or a custom `Icon` element
   * carrying its own size/colour (e.g. `<Icon icon='…' classNames='text-success-text' />`).
   */
  icon?: string | ReactElement;
  /** Primary line. */
  title: ReactNode;
  /** Optional secondary line, aligned under the title in the content column. */
  description?: ReactNode;
}>;

export const ListItemContent = forwardRef<HTMLDivElement, ListItemContentProps>(
  ({ classNames, icon, title, description }, forwardedRef) => {
    // Drop the leading icon track when no icon is set, so the content isn't indented past empty space.
    const hasIcon = icon != null;
    const styles = listTheme.styles({ hasIcon });
    return (
      <div className={styles.itemContentRoot({ class: mx(classNames) })} ref={forwardedRef}>
        {hasIcon && (
          <div className={styles.itemContentIcon()}>
            {typeof icon === 'string' ? <Icon icon={icon} size={5} /> : icon}
          </div>
        )}
        <span className={styles.itemContentTitle()}>{title}</span>
        {description != null && <span className={styles.itemContentDescription()}>{description}</span>}
      </div>
    );
  },
);

ListItemContent.displayName = 'ItemContent';
