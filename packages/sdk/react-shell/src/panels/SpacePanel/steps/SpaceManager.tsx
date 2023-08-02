//
// Copyright 2023 DXOS.org
//

import { CaretLeft, Check, UserPlus } from '@phosphor-icons/react';
import React, { cloneElement, useCallback } from 'react';

import { Button, ScrollArea, useTranslation } from '@dxos/aurora';
import { descriptionText, getSize, mx } from '@dxos/aurora-theme';
import { useSpaceInvitations } from '@dxos/react-client/echo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { InvitationList, SpaceMemberListContainer } from '../../../components';
import { SpacePanelStepProps } from '../SpacePanelProps';

type SpaceManagerProps = SpacePanelStepProps;

export const SpaceManager = ({
  active,
  space,
  createInvitationUrl,
  send,
  doneActionParent,
  onDone,
}: SpaceManagerProps) => {
  const { t } = useTranslation('os');
  const invitations = useSpaceInvitations(space?.key);

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  const doneButton = (
    <Button onClick={onDone} disabled={!active} classNames='mbs-2 pli-2 order-1' data-testid='identity-panel-done'>
      <CaretLeft weight='bold' className={mx(getSize(2), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );

  return (
    <>
      <ScrollArea.Root classNames='grow shrink basis-28 -mli-2'>
        <ScrollArea.Viewport classNames='is-full pli-2'>
          <h3 className={mx(descriptionText, 'text-center mlb-2')}>{t('space invitation list heading')}</h3>
          <InvitationList
            send={send}
            invitations={invitations}
            onClickRemove={(invitation) => invitation.cancel()}
            createInvitationUrl={createInvitationUrl}
          />
          <Button
            disabled={!active}
            classNames='is-full flex gap-2 mbs-2'
            onClick={(e) => {
              const testing = e.altKey && e.shiftKey;
              const invitation = space.createInvitation?.(
                testing ? { type: Invitation.Type.MULTIUSE, authMethod: Invitation.AuthMethod.NONE } : undefined,
              );
              // TODO(wittjosiah): Don't depend on NODE_ENV.
              if (invitation && process.env.NODE_ENV !== 'production') {
                invitation.subscribe(onInvitationEvent);
              }
            }}
            data-testid='spaces-panel.create-invitation'
          >
            <span>{t('create space invitation label')}</span>
            <UserPlus className={getSize(4)} weight='bold' />
          </Button>
          <h3 className={mx(descriptionText, 'text-center mbs-4 mbe-2')}>{t('space member list heading')}</h3>
          <SpaceMemberListContainer spaceKey={space.key} includeSelf />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='vertical'>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </>
  );
};
