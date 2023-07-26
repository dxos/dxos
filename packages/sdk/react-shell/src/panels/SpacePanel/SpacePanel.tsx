//
// Copyright 2023 DXOS.org
//

import { UserPlus, X } from '@phosphor-icons/react';
import React, { cloneElement, useCallback } from 'react';

import { Button, DensityProvider, Separator, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { TooltipContent, TooltipRoot, TooltipTrigger } from '@dxos/react-appkit';
import { useSpaceInvitations, Space } from '@dxos/react-client/echo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { InvitationList, SpaceMemberListContainer } from '../../components';
import { defaultSurface, subduedSurface } from '../../styles';

export type SpacePanelProps = {
  titleId?: string;
  space: Space;
  createInvitationUrl: (invitationCode: string) => string;
  doneActionParent?: Parameters<typeof cloneElement>[0];
  onDone?: () => void;
};

export type SpaceView = 'current space';

export const SpacePanel = ({ titleId, space, createInvitationUrl, doneActionParent, onDone }: SpacePanelProps) => {
  const { t } = useTranslation('os');
  const invitations = useSpaceInvitations(space?.key);
  const name = space?.properties.name;

  if (!space) {
    return null;
  }

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  const doneButton = (
    <Button variant='ghost' onClick={() => onDone?.()} data-testid='show-all-spaces'>
      <X className={getSize(4)} weight='bold' />
    </Button>
  );

  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col'>
        <div role='none' className={mx(subduedSurface, 'rounded-bs-md flex items-center p-2 gap-2')}>
          {/* TODO(wittjosiah): Label this as the space panel. */}
          <h2 id={titleId} className={mx('grow font-system-medium', !name && 'font-mono')}>
            {name ?? space.key.truncate()}
          </h2>
          <TooltipRoot>
            <TooltipContent classNames='z-50'>{t('close label')}</TooltipContent>
            <TooltipTrigger asChild>
              {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
            </TooltipTrigger>
          </TooltipRoot>
        </div>
        <div role='region' className={mx(defaultSurface, 'rounded-be-md p-2')}>
          <InvitationList
            invitations={invitations}
            onClickRemove={(invitation) => invitation.cancel()}
            createInvitationUrl={createInvitationUrl}
          />
          <Button
            classNames='is-full flex gap-2 mbs-2'
            onClick={(e) => {
              const testing = e.altKey && e.shiftKey;
              const invitation = space?.createInvitation(
                testing ? { type: Invitation.Type.MULTIUSE, authMethod: Invitation.AuthMethod.NONE } : undefined,
              );
              // TODO(wittjosiah): Don't depend on NODE_ENV.
              if (process.env.NODE_ENV !== 'production') {
                invitation.subscribe(onInvitationEvent);
              }
            }}
            data-testid='spaces-panel.create-invitation'
          >
            <span>{t('create space invitation label')}</span>
            <UserPlus className={getSize(4)} weight='bold' />
          </Button>
          <Separator />
          <SpaceMemberListContainer spaceKey={space.key} includeSelf />
        </div>
      </div>
    </DensityProvider>
  );
};
