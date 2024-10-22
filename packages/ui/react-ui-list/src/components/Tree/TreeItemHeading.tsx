//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, memo, useCallback, useMemo } from 'react';

import { Button, Icon } from '@dxos/react-ui';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';

export type NavTreeItemHeadingProps = {
  label: string;
  icon?: string;
  className?: string;
  disabled?: boolean;
  current?: boolean;
  onSelect?: () => void;
};

export const TreeItemHeading = memo(
  forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
    ({ label, icon, className, disabled, current, onSelect }, forwardedRef) => {
      const handleButtonKeydown = useCallback(
        (event: KeyboardEvent) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.();
          }
        },
        [onSelect],
      );

      const buttonClassNames = useMemo(
        () => ['grow gap-1 !pis-0.5 hover:!bg-transparent dark:hover:!bg-transparent', className],
        [className],
      );

      return (
        <TextTooltip
          text={label}
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
            classNames={buttonClassNames}
            disabled={disabled}
            onClick={onSelect}
            onKeyDown={handleButtonKeydown}
            {...(current && { 'aria-current': 'location' })}
          >
            {icon && <Icon icon={icon ?? 'ph--placeholder--regular'} size={4} classNames='is-[1em] bs-[1em] mlb-1' />}
            <span className='flex-1 is-0 truncate text-start text-sm font-normal'>{label}</span>
          </Button>
        </TextTooltip>
      );
    },
  ),
);
