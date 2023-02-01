//
// Copyright 2023 DXOS.org
//
import { ProhibitInset } from 'phosphor-react';
import React, { cloneElement, ForwardedRef, forwardRef } from 'react';

import { AuthenticatingInvitationObservable } from '@dxos/client';
import { useSpace } from '@dxos/react-client';
import { Avatar, Button, getSize, Heading, mx, Trans, useId, useTranslation } from '@dxos/react-components';

import { subduedSurface } from '../../styles';

export interface JoinSpaceHeadingProps {
  titleId: string;
  invitation?: AuthenticatingInvitationObservable;
  onClickExit?: () => void;
  exitActionParent?: Parameters<typeof cloneElement>[0];
}

export const JoinHeading = forwardRef(
  (
    { titleId, invitation, onClickExit, exitActionParent }: JoinSpaceHeadingProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { t } = useTranslation('os');

    const space = useSpace(invitation?.invitation?.spaceKey);
    const spaceTitle = space?.getProperty('title') ?? '(Space title not available)';

    const nameId = useId('spaceDisplayName');

    const exitButton = (
      <Button compact variant='ghost' {...(onClickExit && { onClick: onClickExit })} className='grow-0 shrink-0'>
        <ProhibitInset className={getSize(5)} />
        <span className='sr-only'>{t('exit label')}</span>
      </Button>
    );

    return (
      <div role='none' className={mx(subduedSurface, 'p-2 rounded-bs-md')} ref={ref}>
        <div role='group' className='flex items-center gap-2'>
          <Avatar fallbackValue={invitation?.invitation?.spaceKey?.toHex() ?? ''} labelId={nameId} />
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
          {exitActionParent ? cloneElement(exitActionParent, {}, exitButton) : exitButton}
        </div>
      </div>
    );
  }
);
