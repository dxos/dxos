//
// Copyright 2023 DXOS.org
//
import { X } from '@phosphor-icons/react';
import React, { cloneElement, ForwardedRef, forwardRef } from 'react';

import { Identity, useSpace } from '@dxos/react-client';
import { Avatar, getSize, mx, useId, useTranslation } from '@dxos/react-components';

import { InvitationEmoji } from '../../components';
import { Title, CloseButton, Content } from '../Panel';
import { JoinPanelMode } from './JoinPanelProps';
import { JoinState } from './joinMachine';
import { HaloRing } from '../../components/HaloRing';

export interface JoinSpaceHeadingProps {
  mode?: JoinPanelMode;
  titleId: string;
  identity?: Identity | null;
  joinState?: JoinState;
  onExit?: () => void;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  preventExit?: boolean;
}

// TODO(wittjosiah): Accesses the space properties directly which will trigger ECHO warnings without observer.
export const JoinHeading = forwardRef(
  (
    { mode, titleId, joinState, onExit, exitActionParent, preventExit, identity }: JoinSpaceHeadingProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { t } = useTranslation('os');

    const space = useSpace(joinState?.context.space.invitation?.spaceKey);
    const name = space?.properties.name;
    const nameId = useId(mode === 'halo-only' ? 'identityDisplayName' : 'spaceDisplayName');

    const invitationId = joinState?.context[mode === 'halo-only' ? 'halo' : 'space'].invitation?.invitationId;

    const exitButton = (
      <CloseButton label={t('exit label')} {...(onExit && { onClick: onExit })} data-testid='join-exit'>
        <X weight='bold' className={getSize(4)} />
        <span className='sr-only'>{}</span>
      </CloseButton>
    );

    return (
      <div role='none' className={mx('relative')} ref={ref}>
        <Content className='flex items-center justify-center gap-2'>
          <HaloRing loading={!invitationId && !identity} status={identity || invitationId ? 'active' : 'inactive'}>
            {invitationId ? (
              <InvitationEmoji {...{ invitationId }} />
            ) : identity ? (
              <Avatar fallbackValue={identity?.identityKey?.toHex()} labelId='' />
            ) : null}
          </HaloRing>
          {name && <p id={nameId}>{name}</p>}
        </Content>
      </div>
    );
  }
);
