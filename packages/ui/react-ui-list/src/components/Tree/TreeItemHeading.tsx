//
// Copyright 2024 DXOS.org
//

import React, { type KeyboardEvent, forwardRef, memo, useCallback } from 'react';

import { Button, Icon, toLocalizedString, useTranslation, type Label } from '@dxos/react-ui';
import { TextTooltip } from '@dxos/react-ui-text-tooltip';
import { mx } from '@dxos/react-ui-theme';

export type NavTreeItemHeadingProps = {
  label: Label;
  icon?: string;
  className?: string;
  disabled?: boolean;
  current?: boolean;
  onSelect?: () => void;
};

export const TreeItemHeading = memo(
  forwardRef<HTMLButtonElement, NavTreeItemHeadingProps>(
    ({ label, icon, className, disabled, current, onSelect }, forwardedRef) => {
      const { t } = useTranslation();

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
            classNames={mx('grow gap-1 !pis-0.5 hover:!bg-transparent dark:hover:!bg-transparent', className)}
            disabled={disabled}
            onClick={onSelect}
            onKeyDown={handleButtonKeydown}
            {...(current && { 'aria-current': 'location' })}
          >
            {icon && <Icon icon={icon ?? 'ph--placeholder--regular'} size={4} classNames='is-[1em] bs-[1em] mlb-1' />}
            <span className='flex-1 is-0 truncate text-start text-sm font-normal'>{toLocalizedString(label, t)}</span>
          </Button>
        </TextTooltip>
      );
    },
  ),
);
