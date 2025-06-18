//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { railGridHorizontalContainFitContent, Stack, StackItem, type StackProps } from '../../components';
import { translationKey } from '../../translations';

const CardStackContent = ({
  children,
  classNames,
  itemsCount = 0,
  ...props
}: Omit<StackProps, 'orientation' | 'size' | 'rail' | 'separatorOnScroll'>) => {
  return (
    <Stack
      orientation='vertical'
      size='contain'
      rail={false}
      classNames={
        /* NOTE(thure): Do not let this element have zero intrinsic size, otherwise the drop indicator will not display. See #9035. */
        ['plb-1', itemsCount > 0 && 'plb-2', classNames]
      }
      itemsCount={itemsCount}
      separatorOnScroll={9}
      {...props}
    >
      {children}
    </Stack>
  );
};

const CardStackHeading = ({ draggable, children }: PropsWithChildren<{ draggable?: boolean }>) => {
  const { t } = useTranslation(translationKey);
  return (
    <StackItem.Heading classNames='mli-2 order-first bg-transparent rounded-bs-md'>
      {draggable && (
        <StackItem.DragHandle asChild>
          <IconButton
            iconOnly
            icon='ph--dots-six-vertical--regular'
            variant='ghost'
            label={t('drag handle label')}
            classNames='pli-2'
          />
        </StackItem.DragHandle>
      )}
      {children}
    </StackItem.Heading>
  );
};

const CardStackFooter = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div
      role='none'
      className='plb-2 mli-2 border-bs border-transparent [[data-scroll-separator-end="true"]_&]:border-subduedSeparator'
    >
      {children}
    </div>
  );
};

const CardStackRoot = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div
      role='none'
      className={mx(
        'shrink min-bs-0 bg-baseSurface border border-separator rounded-md grid dx-focus-ring-group-x-indicator kanban-drop',
        railGridHorizontalContainFitContent,
      )}
      data-scroll-separator='false'
    >
      {children}
    </div>
  );
};

export const CardStack = {
  Root: CardStackRoot,
  Content: CardStackContent,
  Heading: CardStackHeading,
  Footer: CardStackFooter,
};
