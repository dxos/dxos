//
// Copyright 2023 DXOS.org
//
import { Cancel } from '@radix-ui/react-alert-dialog';
import { ProhibitInset } from 'phosphor-react';
import React, { ForwardedRef, forwardRef } from 'react';

import { CancellableInvitationObservable } from '@dxos/client';
import { useSpace } from '@dxos/react-client';
import { Avatar, Button, getSize, Heading, mx, Trans, useId, useTranslation } from '@dxos/react-components';

import { subduedSurface } from '../../styles';

export interface JoinSpaceHeadingProps {
  titleId: string;
  invitation?: CancellableInvitationObservable;
  onClickExit?: () => void;
}

export const JoinHeading = forwardRef(
  ({ titleId, invitation, onClickExit }: JoinSpaceHeadingProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { t } = useTranslation('os');

    const space = useSpace(invitation?.invitation?.spaceKey);
    const spaceTitle = space?.getProperty('title') ?? '(Space title not available)';

    const nameId = useId('spaceDisplayName');

    return (
      <div role='none' className={mx(subduedSurface, 'rounded-bs-md')} ref={ref}>
        {invitation ? (
          <div role='group' className='flex items-center gap-2'>
            <Avatar fallbackValue={invitation.invitation?.spaceKey?.toHex() ?? ''} labelId={nameId} />
            <Heading level={1} className='font-body font-normal text-base grow' id={titleId}>
              <Trans
                {...{
                  defaults: t('join space heading'),
                  components: {
                    small: <span className='block leading-none mbe-1 font-system-medium text-sm' />,
                    large: <span className='block leading-none' id={nameId} />
                  },
                  values: { spaceTitle }
                }}
              />
            </Heading>
            <Cancel asChild>
              <Button
                compact
                variant='ghost'
                {...(onClickExit && { onClick: onClickExit })}
                className='grow-0 shrink-0'
              >
                <ProhibitInset className={getSize(5)} />
                <span className='sr-only'>{t('exit label')}</span>
              </Button>
            </Cancel>
          </div>
        ) : (
          <Cancel asChild>
            <Button compact variant='ghost' {...(onClickExit && { onClick: onClickExit })} className='is-full'>
              <ProhibitInset className={getSize(5)} />
              <span>{t('exit label')}</span>
            </Button>
          </Cancel>
        )}
      </div>
    );
  }
);
