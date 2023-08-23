//
// Copyright 2023 DXOS.org
//

import { UserPlus } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { ScrollArea, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useSpaceInvitations } from '@dxos/react-client/echo';
import { CancellableInvitationObservable, Invitation, InvitationEncoder } from '@dxos/react-client/invitations';

import {
  InvitationList,
  InvitationListProps,
  PanelActions,
  SpaceMemberList,
  SpaceMemberListProps,
} from '../../../components';
import { LargeButton } from '../../../components/Panel/LargeButton';
import { SpacePanelStepProps } from '../SpacePanelProps';

export type SpaceManagerImplProps = SpacePanelStepProps & {
  invitations?: CancellableInvitationObservable[];
  onCreateInvitationClick?: (e: React.MouseEvent) => void;
  SpaceMemberList?: React.FC<SpaceMemberListProps>;
  InvitationList?: React.FC<InvitationListProps>;
};

export type SpaceManagerProps = SpaceManagerImplProps & {};

export const SpaceManager = (props: SpaceManagerProps) => {
  const { space } = props;

  const invitations = useSpaceInvitations(space?.key);

  const onInvitationEvent = useCallback((invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
    }
  }, []);

  return (
    <SpaceManagerImpl
      {...props}
      invitations={invitations}
      onCreateInvitationClick={(e) => {
        const testing = e.altKey && e.shiftKey;
        const invitation = space.createInvitation?.(
          testing ? { type: Invitation.Type.MULTIUSE, authMethod: Invitation.AuthMethod.NONE } : undefined,
        );
        // TODO(wittjosiah): Don't depend on NODE_ENV.
        if (invitation && process.env.NODE_ENV !== 'production') {
          invitation.subscribe(onInvitationEvent);
        }
      }}
    />
  );
};

export const SpaceManagerImpl = (props: SpaceManagerImplProps) => {
  const {
    active,
    space,
    createInvitationUrl,
    send,
    onCreateInvitationClick,
    invitations,
    SpaceMemberList: SpaceMemberListComponent = SpaceMemberList,
    InvitationList: InvitationListComponent = InvitationList,
  } = props;
  const { t } = useTranslation('os');

  // const doneButton = (
  //   <PanelAction
  //     aria-label={t('done label')}
  //     onClick={onDone}
  //     disabled={!active}
  //     classNames='order-1'
  //     data-testid='identity-panel-done'
  //   >
  //     <Check weight='light' className={getSize(6)} />
  //   </PanelAction>
  // );
  const visibleInvitations = invitations?.filter(
    (invitation) => ![Invitation.State.SUCCESS, Invitation.State.CANCELLED].includes(invitation.get().state),
  );

  return (
    <>
      <ScrollArea.Root classNames='grow shrink basis-28 -mli-2'>
        <ScrollArea.Viewport classNames='is-full pli-2'>
          {!!visibleInvitations?.length && (
            <InvitationListComponent
              className='mb-2'
              send={send}
              invitations={visibleInvitations ?? []}
              onClickRemove={(invitation) => invitation.cancel()}
              createInvitationUrl={createInvitationUrl}
            />
          )}
          <SpaceMemberListComponent spaceKey={space.key} includeSelf />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='vertical'>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <PanelActions>
        <LargeButton
          variant='primary'
          disabled={!active}
          onClick={onCreateInvitationClick}
          data-testid='spaces-panel.create-invitation'
        >
          <span>{t('create space invitation label')}</span>
          <UserPlus className={getSize(4)} weight='bold' />
        </LargeButton>
      </PanelActions>
    </>
  );
};
