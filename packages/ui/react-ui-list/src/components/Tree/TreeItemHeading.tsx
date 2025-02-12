//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, type MouseEvent, forwardRef, memo, useCallback } from 'react';

import { Button, Icon, toLocalizedString, useTranslation, type Label } from '@dxos/react-ui';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { mx } from '@dxos/react-ui-theme';

// TODO(wittjosiah): Consider whether there should be a separate disabled prop which was visually distinct
//   rather than just making the item unselectable.
export type NavTreeItemHeadingProps = {
  label: Label;
  icon?: string;
  className?: string;
  disabled?: boolean;
  current?: boolean;
  onSelect?: (option: boolean) => void;
};

export const TreeItemHeading = memo(
  forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
    ({ label, icon, className, disabled, current, onSelect }, forwardedRef) => {
      const { t } = useTranslation();

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
            density='fine'
            classNames={mx(
              'grow gap-2 pis-0.5 hover:bg-transparent dark:hover:bg-transparent',
              'disabled:cursor-default disabled:opacity-100',
              className,
            )}
            disabled={disabled}
            onClick={handleSelect}
            onKeyDown={handleButtonKeydown}
            {...(current && { 'aria-current': 'location' })}
          >
            {icon && <Icon icon={icon ?? 'ph--placeholder--regular'} size={4} classNames='is-[1em] bs-[1em] mlb-1' />}
            <span className='flex-1 is-0 truncate text-start text-sm font-normal' data-tooltip>
              {toLocalizedString(label, t)}
            </span>
          </Button>
        </TextTooltip>
      );
    },
  ),
);
