//
// Copyright 2023 DXOS.org
//

import { UserPlus } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, Separator, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useSpaceInvitations } from '@dxos/react-client/echo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import { InvitationList, SpaceMemberListContainer } from '../../../components';
import { SpacePanelStepProps } from '../SpacePanelProps';

type SpaceManagerProps = SpacePanelStepProps;

export const SpaceManager = ({ active, space, createInvitationUrl, send }: SpaceManagerProps) => {
  const { t } = useTranslation('os');
  const invitations = useSpaceInvitations(space?.key);

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);
  return (
    <>
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
      <Separator classNames='mlb-3' />
      <SpaceMemberListContainer spaceKey={space.key} includeSelf />
    </>
  );
};
