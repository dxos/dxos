//
// Copyright 2023 DXOS.org
//
import { X } from '@phosphor-icons/react';
import React, { cloneElement, ForwardedRef, forwardRef } from 'react';

import { Button, useId, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, mx } from '@dxos/aurora-theme';
import { Heading } from '@dxos/react-appkit';
import { useSpace } from '@dxos/react-client/echo';

import { InvitationEmoji } from '../../components';
import { defaultSurface } from '../../styles';
import { JoinPanelMode } from './JoinPanelProps';
import { JoinState } from './joinMachine';

export interface JoinSpaceHeadingProps {
  mode?: JoinPanelMode;
  titleId: string;
  joinState?: JoinState;
  onExit?: () => void;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  preventExit?: boolean;
}

// TODO(wittjosiah): Accesses the space properties directly which will trigger ECHO warnings without observer.
export const JoinHeading = forwardRef(
  (
    { mode, titleId, joinState, onExit, exitActionParent, preventExit }: JoinSpaceHeadingProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const { t } = useTranslation('os');

    const space = useSpace(joinState?.context.space.invitation?.spaceKey);
    const name = space?.properties.name;
    const nameId = useId(mode === 'halo-only' ? 'identityDisplayName' : 'spaceDisplayName');

    const invitationId = joinState?.context[mode === 'halo-only' ? 'halo' : 'space'].invitation?.invitationId;

    const exitButton = (
      <Button
        variant='ghost'
        {...(onExit && { onClick: onExit })}
        classNames={mx(descriptionText, 'plb-0 pli-2 absolute block-start-1.5 inline-end-2 z-[1]')}
        data-testid='join-exit'
      >
        <X weight='bold' className={getSize(4)} />
        <span className='sr-only'>{t('exit label')}</span>
      </Button>
    );

    return (
      <div role='none' className={mx(defaultSurface, 'pbs-3 pbe-1 rounded-bs-md relative')} ref={ref}>
        {!preventExit &&
          mode !== 'halo-only' &&
          (exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton)}
        <Heading
          level={1}
          className={mx(
            descriptionText,
            'font-body font-system-normal text-center text-sm grow pbe-2',
            mode === 'halo-only' && (preventExit ? 'sr-only' : 'opacity-0'),
          )}
          id={titleId}
        >
          {t(mode === 'halo-only' ? 'selecting identity heading' : 'joining space heading')}
        </Heading>
        <div role='group' className='flex items-center justify-center gap-2'>
          <InvitationEmoji {...{ invitationId }} />
          {name && <p id={nameId}>{name}</p>}
        </div>
      </div>
    );
  },
);
