//
// Copyright 2023 DXOS.org
//
import { X } from '@phosphor-icons/react';
import React, { cloneElement, ForwardedRef, forwardRef } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useSpace } from '@dxos/react-client';
import {
  Avatar,
  Button,
  defaultDescription,
  getSize,
  Heading,
  mx,
  useId,
  useTranslation
} from '@dxos/react-components';

import { defaultSurface } from '../../styles';
import { JoinPanelMode } from './JoinPanelProps';

export interface JoinSpaceHeadingProps {
  mode?: JoinPanelMode;
  titleId: string;
  invitation?: AuthenticatingInvitationObservable;
  onExit?: () => void;
  exitActionParent?: Parameters<typeof cloneElement>[0];
  preventExit?: boolean;
}

// TODO(wittjosiah): Accesses the space properties directly which will trigger ECHO warnings without observer.
export const JoinHeading = forwardRef(
  (
    { mode, titleId, invitation, onExit, exitActionParent, preventExit }: JoinSpaceHeadingProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { t } = useTranslation('os');

    const space = useSpace(invitation?.invitation?.spaceKey);
    const name = space?.properties.name;
    const nameId = useId(mode === 'halo-only' ? 'identityDisplayName' : 'spaceDisplayName');

    const invitationKey =
      mode === 'halo-only'
        ? invitation?.invitation?.identityKey?.toHex()
        : invitation?.invitation?.identityKey?.toHex();

    const exitButton = (
      <Button
        variant='ghost'
        {...(onExit && { onClick: onExit })}
        className={mx(defaultDescription, 'plb-0 pli-2 absolute block-start-2 inline-end-2')}
        data-testid='join-exit'
      >
        <X weight='bold' className={getSize(4)} />
        <span className='sr-only'>{t('exit label')}</span>
      </Button>
    );

    return (
      <div role='none' className={mx(defaultSurface, 'pbs-3 pbe-2 rounded-bs-md relative')} ref={ref}>
        {!preventExit &&
          mode !== 'halo-only' &&
          (exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton)}
        <Heading
          level={1}
          className={mx(defaultDescription, 'font-body font-system-normal text-center text-sm grow pbe-1')}
          id={titleId}
        >
          {t('joining space heading')}
        </Heading>
        <div role='group' className='flex items-center justify-center gap-2'>
          {invitationKey ? (
            <Avatar fallbackValue={invitationKey} labelId={nameId} />
          ) : (
            <span role='none' className={mx(getSize(10), 'bg-neutral-300 dark:bg-neutral-700 rounded-full')} />
          )}
          {name && <p id={nameId}>{name}</p>}
        </div>
      </div>
    );
  }
);
