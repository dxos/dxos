//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, cloneElement, forwardRef } from 'react';

import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/ui-theme';

import { Heading } from '../../components';

import { type JoinPanelMode } from './JoinPanelProps';

export interface JoinSpaceHeadingProps {
  mode?: JoinPanelMode;
  titleId: string;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  onExit?: () => void;
}

// TODO(wittjosiah): Accesses the space properties directly which will trigger ECHO warnings without observer.
export const JoinHeading = forwardRef(
  ({ mode, titleId, exitActionParent, onExit }: JoinSpaceHeadingProps, forwardedRef: ForwardedRef<HTMLDivElement>) => {
    const { t } = useTranslation('os');

    const exitButton = (
      <Button
        variant='ghost'
        {...(onExit && { onClick: onExit })}
        classNames={mx(descriptionText, 'plb-0 pli-2 absolute block-start-0 inline-end-0 z-[1]')}
        data-testid='join-exit'
      >
        <Icon icon='ph--x--bold' size={4} />
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
