//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, forwardRef, memo, useCallback } from 'react';

import { Button, Icon, type Label, Tag, TextTooltip, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getStyles } from '@dxos/ui-theme';

// TODO(wittjosiah): Consider whether there should be a separate disabled prop which was visually distinct
//   rather than just making the item unselectable.
export type TreeItemHeadingProps = {
  label: Label;
  className?: string;
  icon?: string;
  iconHue?: string;
  disabled?: boolean;
  current?: boolean;
  /** Optional item count rendered as a neutral badge directly after the label. */
  count?: number;
  /** Optional count of new/modified items; when greater than zero it replaces {@link count} with a rose badge. */
  modifiedCount?: number;
  onSelect?: (modifiers: { option: boolean; shift: boolean }) => void;
};

export const TreeItemHeading = memo(
  forwardRef<HTMLButtonElement, TreeItemHeadingProps>(
    ({ label, className, icon, iconHue, disabled, current, count, modifiedCount, onSelect }, forwardedRef) => {
      const { t } = useTranslation();
      const styles = iconHue ? getStyles(iconHue) : undefined;

      const handleSelect = useCallback(
        (event: MouseEvent) => {
          onSelect?.({ option: event.altKey, shift: event.shiftKey });
        },
        [onSelect],
      );

      const handleButtonKeydown = useCallback(
        (event: KeyboardEvent) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.({ option: event.altKey, shift: event.shiftKey });
          }
        },
        [onSelect],
      );

      return (
        <TextTooltip
          text={toLocalizedString(label, t)}
          side='bottom'
          truncateQuery='span[data-tooltip]'
          onlyWhenTruncating
          asChild
          ref={forwardedRef}
        >
          <Button
            data-testid='treeItem.heading'
            variant='ghost'
            classNames={[
              'grow shrink min-w-0 justify-start gap-2 ps-0.5 hover:bg-transparent dark:hover:bg-transparent',
              'disabled:cursor-default disabled:opacity-100',
              className,
            ]}
            disabled={disabled}
            onClick={handleSelect}
            onKeyDown={handleButtonKeydown}
            {...(current && { 'aria-current': 'location' })}
          >
            {icon && <Icon size={5} icon={icon ?? 'ph--circle-dashed--regular'} classNames={['my-1', styles?.text]} />}
            <span className='min-w-0 truncate text-start font-normal' data-tooltip>
              {toLocalizedString(label, t)}
            </span>
            <CountBadge count={count} modifiedCount={modifiedCount} />
          </Button>
        </TextTooltip>
      );
    },
  ),
);

/**
 * Renders the count badge after a tree item label.
 * A positive `modifiedCount` (e.g. new/unread items) shows as a rose badge in place of the neutral total `count`.
 */
const CountBadge = ({ count, modifiedCount }: Pick<TreeItemHeadingProps, 'count' | 'modifiedCount'>) => {
  if (typeof modifiedCount === 'number' && modifiedCount > 0) {
    return (
      <Tag hue='rose' classNames='shrink-0 text-center [min-inline-size:1.5rem] tabular-nums'>
        {modifiedCount}
      </Tag>
    );
  }

  if (typeof count === 'number') {
    return (
      <Tag hue='neutral' classNames='shrink-0 text-center [min-inline-size:1.5rem] tabular-nums'>
        {count}
      </Tag>
    );
  }

  return null;
};
