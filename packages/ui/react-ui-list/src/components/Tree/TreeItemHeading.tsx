//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, forwardRef, memo, useCallback } from 'react';

import { Button, Icon, type Label, Tag, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
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
  /** Optional item count rendered as a badge directly after the label. */
  count?: number;
  onSelect?: (option: boolean) => void;
};

export const TreeItemHeading = memo(
  forwardRef<HTMLButtonElement, TreeItemHeadingProps>(
    ({ label, className, icon, iconHue, disabled, current, count, onSelect }, forwardedRef) => {
      const { t } = useTranslation();
      const styles = iconHue ? getStyles(iconHue) : undefined;

      const handleSelect = useCallback(
        (event: MouseEvent) => {
          onSelect?.(event.altKey);
        },
        [onSelect],
      );

      const handleButtonKeydown = useCallback(
        (event: KeyboardEvent) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.(event.altKey);
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
              'grow justify-start gap-2 ps-0.5 hover:bg-transparent dark:hover:bg-transparent',
              'disabled:cursor-default disabled:opacity-100',
              className,
            ]}
            disabled={disabled}
            onClick={handleSelect}
            onKeyDown={handleButtonKeydown}
            {...(current && { 'aria-current': 'location' })}
          >
            {icon && (
              <Icon size={5} icon={icon ?? 'ph--circle-dashed--regular'} classNames={['my-1', styles?.foreground]} />
            )}
            <span className='min-w-0 truncate text-start font-normal' data-tooltip>
              {toLocalizedString(label, t)}
            </span>
            {typeof count === 'number' && (
              <Tag palette='neutral' classNames='shrink-0 text-center [min-inline-size:1.5rem] tabular-nums'>
                {count}
              </Tag>
            )}
          </Button>
        </TextTooltip>
      );
    },
  ),
);
