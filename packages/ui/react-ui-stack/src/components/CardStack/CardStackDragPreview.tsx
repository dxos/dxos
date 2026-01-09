//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { type StackProps } from '../Stack';

const CardStackDragPreviewRoot = ({ children }: PropsWithChildren<{}>) => {
  return (
    <div className='p-2'>
      <div className='rounded-md max-bs-[calc(100dvh-1rem)] overflow-hidden bg-baseSurface border border-separator ring-focusLine ring-neutralFocusIndicator flex flex-col'>
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
        classNames='pli-2'
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
    <div
      className={mx('overflow-y-auto flex-1 pli-2 flex flex-col gap-2', 'plb-1', itemsCount > 0 ? 'plb-2' : 'plb-1')}
    >
      {children}
    </div>
  );
};

const CardStackDragPreviewFooter = ({ children }: PropsWithChildren<{}>) => {
  return <div className='p-2 border-t border-separator'>{children}</div>;
};

export const CardStackDragPreview = {
  Root: CardStackDragPreviewRoot,
  Heading: CardStackDragPreviewHeading,
  Content: CardStackDragPreviewContent,
  Footer: CardStackDragPreviewFooter,
};
