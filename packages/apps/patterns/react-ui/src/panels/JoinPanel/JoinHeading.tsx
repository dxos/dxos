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
  preventExit?: boolean;
}

export const JoinHeading = forwardRef(
  (
    { mode, titleId, invitation, onExit, exitActionParent, preventExit }: JoinSpaceHeadingProps,
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

    const exitButton = (
      <Button compact variant='ghost' {...(onExit && { onClick: onExit })} className='grow-0 shrink-0'>
        <ProhibitInset className={getSize(5)} />
        <span className='sr-only'>{t('exit label')}</span>
      </Button>
    );

    return (
      <div role='none' className={mx(subduedSurface, 'p-2 rounded-bs-md')} ref={ref}>
        <div role='group' className='flex items-center gap-2'>
          {invitationKey ? (
            <Avatar fallbackValue={invitationKey} labelId={nameId} />
          ) : (
            <span role='none' className={mx(getSize(10), 'bg-neutral-300 dark:bg-neutral-700 rounded-full')} />
          )}
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
              <span className='block leading-none font-system-medium text-sm'>
                {mode === 'halo-only' ? t('halo heading') : t('join space heading')}
              </span>
            )}
          </Heading>
          {!preventExit &&
            mode !== 'halo-only' &&
            (exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton)}
        </div>
      </div>
    );
  }
);
