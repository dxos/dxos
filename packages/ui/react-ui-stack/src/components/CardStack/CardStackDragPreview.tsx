//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { IconButton, ScrollArea, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { type StackProps } from '../Stack';

const CardStackDragPreviewRoot = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div className='p-2'>
      <div className='rounded-md max-block-[calc(100dvh-1rem)] overflow-hidden bg-base-surface border border-separator ring-focus-line ring-neutral-focus-indicator flex flex-col'>
        {children}
      </div>
    </div>
  );
};

const CardStackDragPreviewHeading = ({ children }: PropsWithChildren<{}>) => {
  const { t } = useTranslation(translationKey);
  return (
    <div className='flex items-center p-2'>
      <IconButton
        iconOnly
        icon='ph--dots-six-vertical--regular'
        variant='ghost'
        label={t('column drag handle label')}
        classNames='px-2'
      />
      {children}
    </div>
  );
};

const CardStackDragPreviewContent = ({
  children,
  itemsCount = 0,
}: PropsWithChildren<Pick<StackProps, 'itemsCount'>>) => {
  return (
    <ScrollArea.Root orientation='vertical'>
      <ScrollArea.Viewport classNames={mx('px-2 py-1 gap-2', itemsCount > 0 ? 'py-2' : 'py-1')}>
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const CardStackDragPreviewFooter = ({ children }: PropsWithChildren<{}>) => {
  return <div className='p-2 border-bs border-separator'>{children}</div>;
};

/**
 * @deprecated
 */
export const CardStackDragPreview = {
  Root: CardStackDragPreviewRoot,
  Heading: CardStackDragPreviewHeading,
  Content: CardStackDragPreviewContent,
  Footer: CardStackDragPreviewFooter,
};
