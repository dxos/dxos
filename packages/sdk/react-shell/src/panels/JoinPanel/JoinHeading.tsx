//
// Copyright 2023 DXOS.org
//
import { X } from '@phosphor-icons/react';
import React, { cloneElement, type ForwardedRef, forwardRef } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, mx } from '@dxos/aurora-theme';

import { type JoinPanelMode } from './JoinPanelProps';
import { Heading } from '../../components';

export interface JoinSpaceHeadingProps {
  mode?: JoinPanelMode;
  titleId: string;
  onExit?: () => void;
  exitActionParent?: Parameters<typeof cloneElement>[0];
}

// TODO(wittjosiah): Accesses the space properties directly which will trigger ECHO warnings without observer.
export const JoinHeading = forwardRef(
  ({ mode, titleId, onExit, exitActionParent }: JoinSpaceHeadingProps, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const { t } = useTranslation('os');

    const exitButton = (
      <Button
        variant='ghost'
        {...(onExit && { onClick: onExit })}
        classNames={mx(descriptionText, 'plb-0 pli-2 absolute block-start-0 inline-end-0 z-[1]')}
        data-testid='join-exit'
      >
        <X weight='bold' className={getSize(4)} />
        <span className='sr-only'>{t('exit label')}</span>
      </Button>
    );

    return (
      <Heading
        ref={forwardedRef}
        titleId={titleId}
        title={t(mode === 'halo-only' ? 'selecting identity heading' : 'joining space heading')}
        {...(mode === 'halo-only'
          ? { titleSrOnly: true }
          : { corner: exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton })}
        titleSrOnly={mode === 'halo-only'}
      />
    );
  },
);
