//
// Copyright 2023 DXOS.org
//
import { ProhibitInset } from 'phosphor-react';
import React, { cloneElement, ForwardedRef, forwardRef } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useSpace } from '@dxos/react-client';
import { Avatar, Button, getSize, Heading, mx, Trans, useId, useTranslation } from '@dxos/react-components';

import { subduedSurface } from '../../styles';
import { JoinPanelMode } from './JoinPanelProps';

export interface JoinSpaceHeadingProps {
  mode?: JoinPanelMode;
  titleId: string;
  invitation?: AuthenticatingInvitationObservable;
  onExit?: () => void;
  exitActionParent?: Parameters<typeof cloneElement>[0];
}

export const JoinHeading = forwardRef(
  (
    { mode, titleId, invitation, onExit, exitActionParent }: JoinSpaceHeadingProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { t } = useTranslation('os');

    const space = useSpace(invitation?.invitation?.spaceKey);
    const name =
      mode === 'halo-only' ? '(Unknown identity)' : space?.getProperty('title') ?? '(Space title not available)';
    const nameId = useId(mode === 'halo-only' ? 'identityDisplayName' : 'spaceDisplayName');

    const invitationKey =
      mode === 'halo-only'
        ? invitation?.invitation?.identityKey?.toHex()
        : invitation?.invitation?.identityKey?.toHex();

    const exitButton =
      mode === 'halo-only' ? null : (
        <Button compact variant='ghost' {...(onExit && { onClick: onExit })} className='grow-0 shrink-0'>
          <ProhibitInset className={getSize(5)} />
          <span className='sr-only'>{t('exit label')}</span>
        </Button>
      );

    return (
      <div role='none' className={mx(subduedSurface, 'p-2 rounded-bs-md')} ref={ref}>
        <div role='group' className='flex items-center gap-2'>
          <Avatar fallbackValue={invitationKey ?? ''} labelId={nameId} />
          <Heading level={1} className='font-body font-normal text-base grow' id={titleId}>
            {invitation ? (
              <Trans
                {...{
                  defaults: t('joining heading'),
                  components: {
                    small: <span className='block leading-none mbe-1 font-system-medium text-sm' />,
                    large: <span className='block leading-none' id={nameId} />
                  },
                  values: { name }
                }}
              />
            ) : (
              <span className='block leading-none mbe-1 font-system-medium text-sm'>
                {mode === 'halo-only' ? t('halo heading') : t('join space heading')}
              </span>
            )}
          </Heading>
          {exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton}
        </div>
      </div>
    );
  }
);
